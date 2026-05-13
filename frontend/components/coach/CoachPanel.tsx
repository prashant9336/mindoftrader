'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import type { CoachMessage } from '@/types'
import { formatTime, cn } from '@/lib/utils'

interface CoachPanelProps {
  messages: CoachMessage[]
  isConnected: boolean
}

const MSG_CONFIG: Record<CoachMessage['type'], { dot: string; bar: string; label: string }> = {
  info:    { dot: '#4F8EF7', bar: 'rgba(79,142,247,0.5)',  label: 'INFO'    },
  warning: { dot: '#F59E0B', bar: 'rgba(245,158,11,0.5)',  label: 'CAUTION' },
  alert:   { dot: '#FF3B6B', bar: 'rgba(255,59,107,0.55)', label: 'ALERT'   },
  success: { dot: '#00E5A0', bar: 'rgba(0,229,160,0.5)',   label: 'INSIGHT' },
}

export function CoachPanel({ messages, isConnected }: CoachPanelProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <Card className="flex flex-col" style={{ minHeight: '500px' }}>
      <CardHeader
        title="System Mentor"
        subtitle="Live market awareness + behavioral coaching"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
        }
        action={
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={cn('h-1.5 w-1.5 rounded-full', isConnected ? 'bg-state-allowed' : 'bg-state-blocked')}
            />
            <span className="font-mono text-xs text-text-muted">
              {isConnected ? 'LIVE' : 'RECONNECTING'}
            </span>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto" style={{ maxHeight: '430px' }}>
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center py-14 text-center">
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="mb-4 h-px w-12 bg-text-muted"
            />
            <p className="text-sm text-text-muted">Monitoring market conditions...</p>
            <p className="mt-1 text-xs text-text-muted opacity-60">System will speak when relevant</p>
          </div>
        )}

        {/* Message rows — minimal, no heavy boxes */}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const cfg = MSG_CONFIG[msg.type]
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22 }}
                className={cn(
                  'group flex items-start gap-4 px-5 py-3.5 transition-colors duration-200',
                  'hover:bg-bg-border/30',
                  i < messages.length - 1 && 'border-b border-bg-border/50'
                )}
              >
                {/* Left color bar */}
                <div
                  className="mt-1.5 h-3 w-0.5 shrink-0 rounded-full"
                  style={{ backgroundColor: cfg.bar }}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-bold tracking-widest"
                      style={{ color: cfg.dot }}
                    >
                      {cfg.label}
                    </span>
                    {msg.source === 'trade_eval' && (
                      <span className="rounded px-1 py-0.5 text-[9px] font-bold tracking-widest text-text-muted bg-bg-border">
                        TRADE
                      </span>
                    )}
                    <span className="font-mono text-xs text-text-muted opacity-0 transition-opacity group-hover:opacity-100">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-text-secondary">{msg.message}</p>
                </div>

                {/* Dot indicator */}
                <div
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full opacity-60"
                  style={{ backgroundColor: cfg.dot }}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
    </Card>
  )
}
