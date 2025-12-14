import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

const darkClass = 'dark'
const lightClass = 'light'
const storageKey = 'sca-theme-v3'

export type ThemeMode = 'light' | 'dark'

type ThemeContextValue = {
  theme: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'dark'
    }

    const stored = window.localStorage.getItem(storageKey) as ThemeMode | null
    if (stored === 'light' || stored === 'dark') {
      return stored
    }

    // Default to dark mode regardless of system preference
    return 'dark'
  })

  useEffect(() => {
    document.documentElement.classList.toggle(darkClass, theme === 'dark')
    document.documentElement.classList.toggle(lightClass, theme === 'light')
    window.localStorage.setItem(storageKey, theme)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export default ThemeProvider
