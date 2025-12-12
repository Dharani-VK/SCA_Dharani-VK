import clsx from 'clsx'
import { ReactNode } from 'react'

type BadgeProps = {
  children: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
  size?: 'sm' | 'md'
}

const toneStyles: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'bg-primary-500/10 text-primary-200 border-primary-500/30',
  success: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-200 border-amber-500/30',
  danger: 'bg-red-500/10 text-red-200 border-red-500/30',
  info: 'bg-blue-500/10 text-blue-200 border-blue-500/30',
}

function Badge({ children, tone = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        toneStyles[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export default Badge
