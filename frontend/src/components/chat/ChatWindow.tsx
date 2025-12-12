import { useRef, useEffect } from 'react'
import ChatMessage, { ChatRole } from './ChatMessage'
import type { SourceMetadata } from '../../types/chat'

export type ConversationItem = {
  id: string
  role: ChatRole
  content: string
  sources?: SourceMetadata[]
}

type ChatWindowProps = {
  messages: ConversationItem[]
  isLoading?: boolean
}

function ChatWindow({ messages, isLoading }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar">
      <div className="flex flex-col gap-8 pb-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-20 text-center opacity-60">
            <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
              <span className="text-4xl">👋</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Mentor is ready</h3>
              <p className="text-sm text-slate-500">Ask any question about your documents.</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} role={message.role} content={message.content} sources={message.sources} />
          ))
        )}

        {isLoading && (
          <div className="flex w-full gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-400">
              <svg className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div className="flex items-center gap-1 rounded-2xl bg-white px-5 py-4 shadow-sm dark:bg-slate-900/80">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  )
}

export default ChatWindow
