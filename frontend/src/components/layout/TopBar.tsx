import { useState } from 'react'
import { Bars3Icon, SunIcon, MoonIcon, BellIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../../app/providers/ThemeProvider'
import ThemeToggle from '../common/ThemeToggle' // We can reuse or inline logic, but let's inline for specific icon reqs
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import NotificationPopover from '../common/NotificationPopover'

type TopBarProps = {
  onMenuClick: () => void
}

function TopBar({ onMenuClick }: TopBarProps) {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-transparent bg-white/80 px-4 py-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.6)] backdrop-blur-xl dark:bg-slate-900/70 md:px-8 lg:px-10">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:hidden"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>

      <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-3 sm:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-lg shadow-lg shadow-indigo-500/30">
          🎓
        </span>
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          Smart Campus Assistant
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
          </button>

          <NotificationPopover
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        </div>

        {/* Profile Avatar */}
        <button
          type="button"
          aria-label="Open settings"
          onClick={() => navigate('/settings')}
          className="ml-1 h-9 w-9 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 shadow-sm transition hover:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
        >
          <span className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
            {(user?.full_name || 'ST').substring(0, 2).toUpperCase()}
          </span>
        </button>
      </div>
    </header>
  )
}

export default TopBar
