const { VITE_BACKEND_URL, VITE_USE_MOCKS } = import.meta.env

export const API_BASE_URL = VITE_BACKEND_URL || '/api'

export const FEATURE_FLAGS = {
  useMocks: VITE_USE_MOCKS === 'true',
}

export const THEMES = ['light', 'dark'] as const
