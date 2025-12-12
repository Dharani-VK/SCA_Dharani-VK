import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UploadQueueItem } from '../types/file'
import type { ChatMessage } from '../types/chat'
import type { QuizQuestion } from '../types/quiz'

export type AppState = {
  filesQueue: UploadQueueItem[]
  setFilesQueue: (items: UploadQueueItem[]) => void
  upsertFileItems: (items: UploadQueueItem[]) => void
  removeFileItem: (id: string) => void
  clearCompletedFiles: () => void
  profile: { name: string; role: string }
  updateProfile: (profile: { name?: string; role?: string }) => void
  chatHistory: ChatMessage[]
  addChatMessages: (messages: ChatMessage[]) => void
  quizQuestions: QuizQuestion[]
  setQuizQuestions: (questions: QuizQuestion[]) => void
  notificationPrefs: Record<string, boolean>
  updateNotificationPref: (key: string, value: boolean) => void
}

const defaultProfile = {
  name: 'Devon Bailey',
  role: 'AI Program Coordinator',
}

const defaultNotificationPrefs = {
  summaryEmail: true,
  weeklyDigest: false,
  ingestionAlerts: true,
}

const emptyStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
}

const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      filesQueue: [],
      setFilesQueue: (items) => set({ filesQueue: items }),
      upsertFileItems: (items) =>
        set((state) => {
          const map = new Map(state.filesQueue.map((item) => [item.id, item]))
          items.forEach((item) => map.set(item.id, item))
          return { filesQueue: Array.from(map.values()) }
        }),
      removeFileItem: (id) =>
        set((state) => ({ filesQueue: state.filesQueue.filter((item) => item.id !== id) })),
      clearCompletedFiles: () =>
        set((state) => ({ filesQueue: state.filesQueue.filter((item) => item.status !== 'complete') })),
      profile: defaultProfile,
      updateProfile: (updates) =>
        set((state) => ({
          profile: {
            name: updates.name?.trim() || state.profile.name,
            role: updates.role?.trim() || state.profile.role,
          },
        })),
      chatHistory: [],
      addChatMessages: (messages) => set((state) => ({ chatHistory: [...state.chatHistory, ...messages] })),
      quizQuestions: [],
      setQuizQuestions: (questions) => set({ quizQuestions: questions }),
      notificationPrefs: defaultNotificationPrefs,
      updateNotificationPref: (key, value) =>
        set((state) => ({ notificationPrefs: { ...state.notificationPrefs, [key]: value } })),
    }),
    {
      name: 'sca-ui-preferences',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? emptyStorage : window.localStorage)),
      partialize: (state) => ({
        profile: state.profile,
        notificationPrefs: state.notificationPrefs,
        filesQueue: state.filesQueue,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return
        }
        const snapshot = state as Partial<AppState>
        if (!snapshot.profile) {
          state.profile = defaultProfile
        }
        if (!snapshot.notificationPrefs) {
          state.notificationPrefs = defaultNotificationPrefs
        }
        if (!snapshot.filesQueue) {
          state.filesQueue = []
        }

        // CRITICAL: Clear upload queue if user has changed
        // This prevents cross-tenant data leakage in the upload queue
        const currentUser = localStorage.getItem('student') || localStorage.getItem('admin')
        const storedUser = localStorage.getItem('sca-last-user')

        if (currentUser !== storedUser) {
          // User has changed - clear the upload queue
          console.log('User changed detected - clearing upload queue for isolation')
          state.filesQueue = []
          localStorage.setItem('sca-last-user', currentUser || '')
        }
      },
    }
  )
)

export default useAppStore
