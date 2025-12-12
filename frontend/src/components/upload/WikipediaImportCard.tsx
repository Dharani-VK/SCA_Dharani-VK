import { useState } from 'react'
import { ArrowPathIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import Button from '../common/Button'
import { ingestWikipedia } from '../../services/api/documents'

type WikipediaImportCardProps = {
    onImportComplete: () => void
}

function WikipediaImportCard({ onImportComplete }: WikipediaImportCardProps) {
    const [wikiTopic, setWikiTopic] = useState('')
    const [wikiLoading, setWikiLoading] = useState(false)

    const handleWikiImport = async () => {
        if (!wikiTopic.trim()) return
        setWikiLoading(true)
        try {
            await ingestWikipedia(wikiTopic)
            setWikiTopic('')
            onImportComplete()
        } catch (err: any) {
            alert("Import failed: " + (err.message || "Unknown error"))
        } finally {
            setWikiLoading(false)
        }
    }

    return (
        <section className="upload-fade-in grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-slate-200 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.65)] transition-transform duration-500 ease-out md:p-8 md:hover:-translate-y-1">
            <header className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-100">
                    <GlobeAltIcon className="h-6 w-6 text-primary-400" />
                    Wikipedia Import
                </h2>
                <p className="text-sm text-slate-400">
                    Instantly fetch authoritative articles to expand your knowledge base.
                </p>
            </header>

            <div className="flex w-full gap-3">
                <div className="relative flex-1 group">
                    <input
                        type="text"
                        placeholder="Enter a topic (e.g., 'Machine Learning')"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 group-hover:border-slate-600"
                        value={wikiTopic}
                        onChange={e => setWikiTopic(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleWikiImport()}
                        disabled={wikiLoading}
                    />
                </div>
                <Button
                    onClick={handleWikiImport}
                    disabled={wikiLoading || !wikiTopic.trim()}
                    className="min-w-[120px] rounded-xl"
                    variant="primary"
                >
                    {wikiLoading ? (
                        <span className="flex items-center gap-2">
                            <ArrowPathIcon className="h-4 w-4 animate-spin" /> Fetching
                        </span>
                    ) : 'Import'}
                </Button>
            </div>
        </section>
    )
}

export default WikipediaImportCard
