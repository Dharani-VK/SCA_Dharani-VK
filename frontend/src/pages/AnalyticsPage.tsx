import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Select from '../components/common/Select'
import { ArrowPathIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { fetchAnalyticsOptions } from '../services/api/analytics'
import type { AnalyticsOptionsResponse } from '../services/api/analytics'
import { API_BASE_URL } from '../utils/constants'
import { useAuth } from '../context/AuthContext'

function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [refreshKey, setRefreshKey] = useState(0)
  const [options, setOptions] = useState<AnalyticsOptionsResponse | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(false)

  const scope = (searchParams.get('scope') as 'session' | 'overall' | 'document' | 'recent') || 'session'
  const selectedSession = searchParams.get('sessionId') ?? ''
  const selectedSource = searchParams.get('source') ?? ''

  useEffect(() => {
    let active = true
    setLoadingOptions(true)
    fetchAnalyticsOptions()
      .then((data) => {
        if (!active) return
        setOptions(data)
        setOptionsError(null)
      })
      .catch((err) => {
        if (!active) return
        setOptionsError(err instanceof Error ? err.message : 'Unable to load analytics options.')
      })
      .finally(() => {
        if (active) setLoadingOptions(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!options) return

    if (scope === 'session' && !selectedSession) {
      const fallbackSession = options.latestSessionId || options.sessions[0]?.sessionId
      if (fallbackSession) {
        const params = new URLSearchParams(searchParams)
        params.set('scope', 'session')
        params.set('sessionId', fallbackSession)
        params.delete('source')
        setSearchParams(params, { replace: true })
      }
    }

    if (scope === 'document' && !selectedSource && options.sources.length) {
      const fallbackSource = options.sources[0]?.value
      if (fallbackSource) {
        const params = new URLSearchParams(searchParams)
        params.set('scope', 'document')
        params.set('source', fallbackSource)
        params.delete('sessionId')
        setSearchParams(params, { replace: true })
      }
    }
  }, [options, scope, searchParams, selectedSession, selectedSource, setSearchParams])

  const { token } = useAuth()

  const analyticsUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('scope', scope)

    if (scope === 'session' || scope === 'recent') {
      const sessionId = selectedSession || options?.latestSessionId
      if (sessionId) {
        params.set('sessionId', sessionId)
      }
    } else if (scope === 'document') {
      if (selectedSource) {
        params.set('source', selectedSource)
      }
    }

    if (token) {
      params.set('token', token)
    }

    return `${API_BASE_URL}/analytics/quiz?${params.toString()}`
  }, [options?.latestSessionId, scope, selectedSession, selectedSource, token])

  const iframeKey = useMemo(() => `${refreshKey}-${analyticsUrl}`, [analyticsUrl, refreshKey])

  const handleScopeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextScope = event.target.value as 'session' | 'overall' | 'document' | 'recent'
    const params = new URLSearchParams(searchParams)
    params.set('scope', nextScope)

    if (nextScope === 'session' || nextScope === 'recent') {
      const fallbackSession = selectedSession || options?.latestSessionId || options?.sessions[0]?.sessionId
      if (fallbackSession) {
        params.set('sessionId', fallbackSession)
      } else {
        params.delete('sessionId')
      }
      params.delete('source')
    } else if (nextScope === 'document') {
      const fallbackSource = selectedSource || options?.sources[0]?.value
      if (fallbackSource) {
        params.set('source', fallbackSource)
      }
      params.delete('sessionId')
    } else if (nextScope === 'overall') {
      params.delete('sessionId')
      params.delete('source')
    }

    setSearchParams(params, { replace: true })
  }

  const handleSessionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('sessionId', value)
    } else {
      params.delete('sessionId')
    }
    setSearchParams(params, { replace: true })
  }

  const handleSourceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('source', value)
    } else {
      params.delete('source')
    }
    setSearchParams(params, { replace: true })
  }

  const selectedSessionDetails = useMemo(() => {
    if (!options || !selectedSession) return null
    return options.sessions.find((session) => session.sessionId === selectedSession) ?? null
  }, [options, selectedSession])

  const selectedSourceDetails = useMemo(() => {
    if (!options || !selectedSource) return null
    return options.sources.find((source) => source.value === selectedSource) ?? null
  }, [options, selectedSource])

  const handleRefresh = () => {
    setRefreshKey((key) => key + 1)
  }

  return (
    <div className="space-y-6">
      <Card
        title="Quiz Performance Analytics"
        subtitle="Interactive visualization of how students perform across quiz attempts."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleRefresh} icon={<ArrowPathIcon className="h-4 w-4" />}>
              Refresh
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Select
            label="View mode"
            value={scope}
            onChange={handleScopeChange}
            disabled={loadingOptions}
          >
            <option value="session">Latest session</option>
            <option value="overall">Overall performance</option>
            <option value="document">By document</option>
          </Select>

          {scope === 'session' && (
            <Select
              label="Session"
              value={selectedSession}
              onChange={handleSessionChange}
              disabled={loadingOptions || !(options?.sessions.length)}
              helperText={!options?.sessions.length ? 'No quiz sessions recorded yet.' : undefined}
            >
              {options?.sessions.map((session) => (
                <option key={session.sessionId} value={session.sessionId}>
                  {session.primarySource ? `${session.primarySource} - ` : ''}
                  {session.accuracy.toFixed(1)}% accuracy ({session.attempts} attempts)
                </option>
              ))}
            </Select>
          )}

          {scope === 'document' && (
            <Select
              label="Document"
              value={selectedSource}
              onChange={handleSourceChange}
              disabled={loadingOptions || !(options?.sources.length)}
              helperText={!options?.sources.length ? 'Quiz a document to unlock source analytics.' : undefined}
            >
              {options?.sources.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label} - {source.accuracy.toFixed(1)}% ({source.attempts})
                </option>
              ))}
            </Select>
          )}
        </div>

        {optionsError && (
          <p className="mt-3 text-sm text-rose-400">{optionsError}</p>
        )}

        {scope === 'session' && selectedSessionDetails && (
          <p className="mt-3 text-xs text-slate-400">
            Showing session from {selectedSessionDetails.startedAt ?? 'recent quiz'} with {selectedSessionDetails.attempts} attempts -
            {` ${selectedSessionDetails.accuracy.toFixed(1)}% accuracy`}
            {selectedSessionDetails.primarySource ? ` - Document: ${selectedSessionDetails.primarySource}` : ''}.
          </p>
        )}

        {scope === 'document' && selectedSourceDetails && (
          <p className="mt-3 text-xs text-slate-400">
            Showing aggregated performance for <span className="font-semibold text-slate-200">{selectedSourceDetails.label}</span>
            {` - ${selectedSourceDetails.accuracy.toFixed(1)}% accuracy across ${selectedSourceDetails.attempts} attempts.`}
          </p>
        )}

        <div className="mt-8 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200/60 bg-white/50 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/40">
          <iframe
            key={iframeKey}
            src={analyticsUrl}
            className="h-full w-full border-0"
            title="Analytics Visualization"
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
          />
        </div>
      </Card>
    </div>
  )
}

export default AnalyticsPage
