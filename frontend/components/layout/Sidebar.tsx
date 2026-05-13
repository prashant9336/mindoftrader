'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/trade',
    label: 'Trade',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    href: '/coach',
    label: 'Live Coach',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    badge: 'LIVE',
  },
  {
    href: '/journal',
    label: 'Journal',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex h-full w-64 flex-col border-r border-bg-border bg-bg-secondary">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-bg-border px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-blue/20">
          <span className="text-base font-bold text-accent-blue">M</span>
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary tracking-tight">MindOfTrader</p>
          <p className="text-xs text-text-muted">Trading Decision OS</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Navigation
        </p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-accent-blue/15 text-accent-blue'
                      : 'text-text-secondary hover:bg-bg-border hover:text-text-primary'
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 h-8 w-0.5 rounded-r bg-accent-blue"
                    />
                  )}
                  <span className={cn(active ? 'text-accent-blue' : 'text-text-muted group-hover:text-text-secondary')}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-md bg-state-allowed/20 px-1.5 py-0.5 text-xs font-bold text-state-allowed">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-bg-border px-6 py-4">
        <p className="text-xs text-text-muted">
          Not financial advice.
          <br />
          Trade with discipline.
        </p>
      </div>
    </aside>
  )
}
