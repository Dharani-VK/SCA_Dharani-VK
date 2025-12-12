import { FEATURE_FLAGS, API_BASE_URL } from '../../utils/constants'
import { mockAskQuestion } from '../mocks/chat.mock'
import type { ChatRequest, ChatResponse } from '../../types/chat'
import { request } from '../httpClient'

export async function askQuestion(payload: ChatRequest): Promise<ChatResponse> {
  if (FEATURE_FLAGS.useMocks) {
    return mockAskQuestion(payload)
  }

  const result = await request<
    { answer: string; sources: string[] },
    {
      question: string
      top_k?: number
      sources?: string[]
      conversation?: Array<{ role: 'user' | 'assistant'; content: string }>
    }
  >(
    `${API_BASE_URL}/qa`,
    {
      method: 'POST',
      body: {
        question: payload.message,
        top_k: payload.topK,
        sources: payload.sources,
        conversation: payload.conversation?.map((turn) => ({
          role: turn.role,
          content: turn.content,
        })),
      },
    }
  )

  return {
    message: result.answer,
    sources: result.sources ?? [],
  }
}
