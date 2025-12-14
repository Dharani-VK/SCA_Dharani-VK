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
        <section className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 md:p-8">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-indigo-50 blur-2xl transition-all group-hover:bg-indigo-100 dark:bg-indigo-900/20 dark:group-hover:bg-indigo-900/30"></div>

            <header className="relative flex flex-col gap-2 mb-6">
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100">
                    <div className="rounded-lg bg-indigo-50 p-2 dark:bg-indigo-900/30">
                        <GlobeAltIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    Wikipedia Import
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                    Instantly fetch and ingest authoritative articles from Wikipedia to expand your knowledge base with trusted definitions and concepts.
                </p>
            </header>

            <div className="relative flex w-full flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group/input">
                    <input
                        type="text"
                        placeholder="Enter a topic (e.g., 'Quantum Mechanics')"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-950"
                        value={wikiTopic}
                        onChange={e => setWikiTopic(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleWikiImport()}
                        disabled={wikiLoading}
                    />
                </div>
                <Button
                    onClick={handleWikiImport}
                    disabled={wikiLoading || !wikiTopic.trim()}
                    className="min-w-[120px] rounded-xl shadow-sm"
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
