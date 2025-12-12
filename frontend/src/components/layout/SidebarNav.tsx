import { NavLink } from 'react-router-dom'
import { useMemo, type ComponentType, type SVGProps } from 'react'
import {
  SparklesIcon,
  ArrowUpTrayIcon,
  ChatBubbleLeftRightIcon,
  QueueListIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  DocumentMagnifyingGlassIcon,
  PresentationChartLineIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

type SidebarNavProps = {
  isDesktop: boolean
  collapsed: boolean
  mobileVisible: boolean
  onCollapseToggle: () => void
  onCloseMobile: () => void
}

type NavItem = {
  to: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const items: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: SparklesIcon },
  { to: '/upload', label: 'Upload', icon: ArrowUpTrayIcon },
  { to: '/documents', label: 'Documents', icon: DocumentMagnifyingGlassIcon },
  { to: '/chat', label: 'Ask AI', icon: ChatBubbleLeftRightIcon },
  { to: '/quiz', label: 'Quiz Lab', icon: QueueListIcon },
  { to: '/analytics', label: 'Analytics', icon: PresentationChartLineIcon },
  { to: '/settings', label: 'Settings', icon: Cog6ToothIcon },
]

function SidebarNav({ isDesktop, collapsed, mobileVisible, onCollapseToggle, onCloseMobile }: SidebarNavProps) {
  const navItems = useMemo(() => items, [])
  const isVisible = isDesktop || mobileVisible
  if (!isVisible) {
    return null
  }

  const showLabels = !isDesktop || !collapsed
  const containerClass = clsx(
    'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200/70 bg-white/90 text-slate-700 shadow-[0_15px_45px_-28px_rgba(15,23,42,0.75)] backdrop-blur-xl transition-transform duration-300 dark:border-slate-800/60 dark:bg-slate-900/85 dark:text-slate-100',
    isDesktop
      ? collapsed
        ? 'w-20 translate-x-0'
        : 'w-64 translate-x-0'
      : mobileVisible
        ? 'w-72 translate-x-0'
        : 'w-72 -translate-x-full'
  )

  return (
    <aside className={containerClass}>
      <div className={clsx('flex items-center justify-between px-5 py-6', isDesktop ? '' : 'pr-3')}>
        <div className={clsx('flex items-center gap-2', collapsed && isDesktop ? 'justify-center' : '')}>
          <span className="rounded-full bg-primary-500/10 p-2 text-primary-500">S</span>
          {showLabels && (
            <span className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Smart Campus</span>
          )}
        </div>
        {isDesktop ? (
          <button
            type="button"
            onClick={onCollapseToggle}
            className="rounded-full border border-slate-300 bg-white/70 p-2 text-slate-500 hover:border-primary-400 hover:text-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:text-primary-300"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronDoubleRightIcon className="h-5 w-5" /> : <ChevronDoubleLeftIcon className="h-5 w-5" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-full border border-transparent p-2 text-slate-500 hover:text-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400"
            aria-label="Close navigation"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      <nav className={clsx('flex-1 space-y-1', isDesktop ? 'px-3' : 'px-4')}>
        {navItems.map((item: NavItem) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={!isDesktop ? onCloseMobile : undefined}
            className={({ isActive }) =>
              clsx(
                'group flex items-center rounded-2xl py-3 text-sm font-medium transition-colors',
                showLabels ? 'gap-3 px-4' : 'justify-center px-2',
                isActive
                  ? 'bg-primary-500/15 text-primary-600 dark:bg-primary-500/10 dark:text-primary-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {showLabels && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-3 pb-6">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('student');
            localStorage.removeItem('admin');
            window.location.href = '/login';
          }}
          className={clsx(
            'group flex w-full items-center rounded-2xl py-3 text-sm font-medium transition-colors text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300',
            showLabels ? 'gap-3 px-4' : 'justify-center px-2'
          )}
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          {showLabels && <span>Sign Out</span>}
        </button>

        {showLabels && (
          <div className="mt-4 px-2 text-xs text-slate-500 dark:text-slate-500">
            <p>v1.0</p>
          </div>
        )}
      </div>
    </aside>
  )
}

export default SidebarNav
