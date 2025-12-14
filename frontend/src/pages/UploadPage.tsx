import { useEffect, useState } from 'react'
import UploadDropzone from '../components/upload/UploadDropzone'
import UploadProgressList from '../components/upload/UploadProgressList'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/common/Button'
import { useUpload } from '../hooks/useUpload'
import { fetchDocuments } from '../services/api/documents'
import { useAuth } from '../context/AuthContext'
import WikipediaImportCard from '../components/upload/WikipediaImportCard'
import type { UploadQueueItem } from '../types/file'

function UploadPage() {
  const { filesQueue, ingestFiles, removeUpload, clearCompleted } = useUpload()
  const { user } = useAuth() // Get current user to track changes
  const [serverDocs, setServerDocs] = useState<UploadQueueItem[]>([])
  const [loading, setLoading] = useState(true)

  const refreshDocuments = async () => {
    try {
      const docs = await fetchDocuments()
      const items: UploadQueueItem[] = docs.map((d) => ({
        id: d.id,
        name: d.title,
        sizeLabel: d.tags.join(', ') || 'Synced',
        progress: 100,
        status: 'complete',
      }))
      setServerDocs(items)
    } catch (err) {
      console.error(err)
    }
  }

  // CRITICAL: Fetch tenant-scoped documents whenever user changes
  // This ensures isolation - each user only sees their own documents
  useEffect(() => {
    // Reset state when user changes
    setServerDocs([])
    setLoading(true)

    // Only fetch if user is logged in
    if (!user) {
      setLoading(false)
      return
    }

    refreshDocuments().finally(() => setLoading(false))
  }, [user]) // Re-fetch when user changes



  // Merge pending local uploads with confirmed server documents
  // Filter out server docs if they are currently being re-uploaded (collision check by name?)
  // For now, simple merge.
  const combinedQueue = [
    ...filesQueue,
    ...serverDocs.filter(sd => !filesQueue.some(fq => fq.name === sd.name))
  ]

  const hasCompleted = combinedQueue.some((item) => item.status === 'complete')

  return (
    <div className="upload-stagger flex w-full flex-col gap-8">
      <PageHeader
        className="upload-fade-in"
        eyebrow="Knowledge ingestion"
        title="Upload learning sources"
        subtitle="Bring in lecture decks, answer keys, syllabi, and curated references so the assistant can craft richer practice and analytics."
        actions={
          hasCompleted && (
            <Button variant="secondary" onClick={clearCompleted}>
              Clear completed
            </Button>
          )
        }
      />

      <UploadDropzone onFilesSelected={ingestFiles} />

      <WikipediaImportCard onImportComplete={refreshDocuments} />

      <section className="upload-fade-in grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-transform duration-500 ease-out dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.65)] md:p-8 md:hover:-translate-y-1">
        <header className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Suggested data sources</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Blend personal material with trusted public references for richer retrieval and practice questions.
          </p>
        </header>
        <ul className="grid gap-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:grid-cols-2">
          <li className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-white/5 dark:text-slate-200/90 dark:hover:bg-white/10">
            <span className="mt-1 block h-2 w-2 rounded-full bg-indigo-500"></span>
            Your own lecture notes, project docs, lab manuals, and past assignments.
          </li>
          <li className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-white/5 dark:text-slate-200/90 dark:hover:bg-white/10">
            <span className="mt-1 block h-2 w-2 rounded-full bg-pink-500"></span>
            Authoritative encyclopedias like the Wikipedia API for quick concept refreshers.
          </li>
          <li className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-white/5 dark:text-slate-200/90 dark:hover:bg-white/10">
            <span className="mt-1 block h-2 w-2 rounded-full bg-emerald-500"></span>
            Open education resources, including NCERT textbooks and other public syllabi.
          </li>
          <li className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-white/5 dark:text-slate-200/90 dark:hover:bg-white/10">
            <span className="mt-1 block h-2 w-2 rounded-full bg-amber-500"></span>
            Instructor slide decks, recorded webinar transcripts, or departmental policy PDFs.
          </li>
        </ul>
      </section>

      <UploadProgressList items={combinedQueue} onRemove={removeUpload} />
    </div>
  )
}

export default UploadPage
