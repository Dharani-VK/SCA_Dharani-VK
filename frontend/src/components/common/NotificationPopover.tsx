import { useRef, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { DocumentPlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import Badge from './Badge'

const notifications = [
    {
        id: 'doc-1',
        title: 'Algorithms Lecture 05',
        owner: 'Prof. Stone',
        time: new Date(Date.now() - 1000 * 60 * 37), // 37 mins ago
        tag: 'Lecture',
    },
    {
        id: 'doc-2',
        title: 'Campus Events Overview',
        owner: 'Student Affairs',
        time: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        tag: 'Announcement',
    },
    {
        id: 'doc-3',
        title: 'AI Ethics Workshop Notes',
        owner: 'Innovation Lab',
        time: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        tag: 'Workshop',
    },
]

type NotificationPopoverProps = {
    isOpen: boolean
    onClose: () => void
}

function NotificationPopover({ isOpen, onClose }: NotificationPopoverProps) {
    const navigate = useNavigate()
    const popoverRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose()
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            ref={popoverRef}
            className="absolute right-0 top-full mt-3 w-80 translate-y-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 transition-all dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10 sm:w-96"
            style={{ animation: 'slideDown 0.2s ease-out' }}
        >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Recent Knowledge
                </h3>
                <button
                    onClick={onClose}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                    <XMarkIcon className="h-4 w-4" />
                </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto py-2">
                {notifications.map((n) => (
                    <div
                        key={n.id}
                        className="group block cursor-pointer px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        onClick={() => {
                            navigate('/documents')
                            onClose()
                        }}
                    >
                        <div className="flex gap-3">
                            <div className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary-100/50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                                <DocumentPlusIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-auto">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                                    {n.title}
                                </p>
                                <div className="mt-1 flex items-center justify-between gap-2">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {n.owner} • {formatDistanceToNow(n.time, { addSuffix: true })}
                                    </p>
                                    <Badge size="sm" tone="info">{n.tag}</Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="border-t border-slate-100 p-2 dark:border-slate-800">
                    <button
                        onClick={() => {
                            navigate('/documents')
                            onClose()
                        }}
                        className="flex w-full items-center justify-center rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                        View all updates
                    </button>
                </div>
            </div>
        </div>
    )
}

export default NotificationPopover
