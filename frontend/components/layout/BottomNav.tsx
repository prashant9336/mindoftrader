'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Home',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="h-5 w-5">
        <rect x="3" y="3" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} strokeOpacity={active ? 0 : 1} />
        <rect x="14" y="3" width="7" height="7" rx="1.5" fill={active ? 'none' : 'none'} />
        <rect x="3" y="14" width="7" height="7" rx="1.5" fill={active ? 'none' : 'none'} />
        <rect x="14" y="14" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} strokeOpacity={active ? 0 : 1} />
      </svg>
    ),
  },
  {
    href: '/trade',
    label: 'Trade',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="h-5 w-5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    href: '/coach',
    label: 'Coach',
    live: true,
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="h-5 w-5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      </svg>
    ),
  },
  {
    href: '/journal',
    label: 'Journal',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="h-5 w-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        background: 'rgba(13,17,23,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(28,35,51,0.8)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 py-3 transition-colors duration-150',
                'min-h-[56px] touch-manipulation',
                active ? 'text-accent-blue' : 'text-text-muted active:text-text-secondary'
              )}
            >
              {/* Active indicator pill */}
              {active && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-accent-blue"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              {/* Live dot for coach */}
              {item.live && (
                <span className="absolute right-[calc(50%-14px)] top-2.5 h-1.5 w-1.5 rounded-full bg-state-allowed" />
              )}

              {item.icon(active)}

              <span className={cn(
                'text-[10px] font-medium tracking-wide',
                active ? 'text-accent-blue' : 'text-text-muted'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
