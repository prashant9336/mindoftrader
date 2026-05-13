'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import type { MarketState } from '@/types'
import { getGreeting } from '@/hooks/useDailyCheckin'

interface DailyCheckinProps {
  marketState: MarketState | null
  tradesToday: number
  tradeLimit: number
  streak: number
  onDismiss: () => void
}

const STATE_CONTEXT: Record<MarketState, { headline: string; guidance: string; color: string }> = {
  TRENDING: {
    headline: 'Market has structure today.',
    guidance: 'Trade ONLY in the direction of the trend. Wait for pullbacks. Do not chase.',
    color: '#00E5A0',
  },
  SIDEWAYS: {
    headline: 'Market is sideways.',
    guidance: 'High probability of fake moves and whipsaws. Be patient. One quality trade is enough.',
    color: '#F59E0B',
  },
  TRAP: {
    headline: 'Market is in a trap condition.',
    guidance: 'Smart money is hunting stops. Stay flat until the market shows real direction.',
    color: '#FF3B6B',
  },
}

export function DailyCheckin({ marketState, tradesToday, tradeLimit, streak, onDismiss }: DailyCheckinProps) {
  const ctx = marketState ? STATE_CONTEXT[marketState] : null
  const remaining = Math.max(0, tradeLimit - tradesToday)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
        className="mb-6 overflow-hidden rounded-2xl border border-bg-border bg-bg-card"
        style={ctx ? { borderColor: `${ctx.color}20` } : {}}
      >
        {/* Top bar */}
        {ctx && (
          <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${ctx.color}60, transparent)` }} />
        )}

        <div className="p-5 sm:p-6">
          {/* Greeting */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                Daily Check-in
              </p>
              <h2 className="mt-1 text-lg font-bold text-text-primary">
                {getGreeting()}.
              </h2>
            </div>
            {streak > 0 && (
              <div className="shrink-0 flex items-center gap-1.5 rounded-xl bg-accent-blue/10 border border-accent-blue/20 px-3 py-1.5">
                <span className="text-sm">🔥</span>
                <span className="font-mono text-xs font-bold text-accent-blue">{streak}d</span>
              </div>
            )}
          </div>

          {/* Market context */}
          {ctx && (
            <div className="mb-4 rounded-xl p-4" style={{ backgroundColor: `${ctx.color}08`, border: `1px solid ${ctx.color}15` }}>
              <p className="text-sm font-semibold" style={{ color: ctx.color }}>
                {ctx.headline}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {ctx.guidance}
              </p>
            </div>
          )}

          {/* Goal + trade counter */}
          <div className="mb-5 flex items-center justify-between rounded-xl border border-bg-border bg-bg-primary/50 px-4 py-3">
            <div>
              <p className="text-xs text-text-muted">Today&apos;s goal</p>
              <p className="mt-0.5 text-sm font-semibold text-text-primary">
                {remaining === 0
                  ? 'Limit reached — you\'re done for today'
                  : `Take only ${remaining} high-quality trade${remaining > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-black" style={{ color: remaining === 0 ? '#FF3B6B' : '#00E5A0' }}>
                {tradesToday}<span className="text-text-muted text-sm font-normal">/{tradeLimit}</span>
              </p>
              <p className="text-xs text-text-muted">trades</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href="/trade"
              onClick={onDismiss}
              className="btn-gradient flex-1 rounded-xl py-2.5 text-center text-sm font-semibold text-white"
            >
              Evaluate a Trade →
            </Link>
            <button
              onClick={onDismiss}
              className="rounded-xl border border-bg-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
            >
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
