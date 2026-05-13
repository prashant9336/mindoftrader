'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { formatNumber, formatPercent, marketStateColor } from '@/lib/utils'
import type { MarketStateResult, MarketState } from '@/types'

interface MarketStatusProps {
  result: MarketStateResult | null
  loading?: boolean
}

const STATE_META: Record<MarketState, { label: string; sublabel: string; glowClass: string }> = {
  TRENDING:  { label: 'TRENDING',  sublabel: 'Directional momentum — trade with structure', glowClass: 'state-glow-green'  },
  SIDEWAYS:  { label: 'SIDEWAYS',  sublabel: 'Low conviction environment',                  glowClass: 'state-glow-yellow' },
  TRAP:      { label: 'TRAP',      sublabel: 'Possible stop hunt — stay flat',               glowClass: 'state-glow-red'    },
}

export function MarketStatus({ result, loading }: MarketStatusProps) {
  if (loading || !result) {
    return (
      <div className="rounded-xl border border-bg-border bg-bg-card p-8 animate-pulse">
        <div className="mx-auto h-16 w-48 rounded-lg bg-bg-border" />
        <div className="mx-auto mt-3 h-4 w-64 rounded bg-bg-border" />
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-bg-border" />)}
        </div>
      </div>
    )
  }

  const { state, data, signals } = result
  const color = marketStateColor(state)
  const meta = STATE_META[state]

  return (
    <div
      className="card-interactive rounded-xl border border-bg-border bg-bg-card overflow-hidden"
      style={{ borderColor: `${color}25` }}
    >
      {/* ── Hero State Block ───────────────────────────────── */}
      <div
        className="relative flex flex-col items-center justify-center py-10 text-center"
        style={{ background: `radial-gradient(ellipse 70% 80% at 50% 0%, ${color}0C 0%, transparent 70%)` }}
      >
        {/* Live indicator */}
        <div className="absolute left-5 top-4 flex items-center gap-2">
          <motion.span
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Live</span>
        </div>

        {/* Price ticker */}
        <div className="absolute right-5 top-4 text-right">
          <AnimatePresence mode="wait">
            <motion.p
              key={data.price}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="font-mono text-base font-bold text-text-primary"
            >
              {data.symbol} {formatNumber(data.price, 2)}
            </motion.p>
          </AnimatePresence>
          <p
            className="font-mono text-xs font-medium"
            style={{ color: data.changePercent >= 0 ? '#00E5A0' : '#FF3B6B' }}
          >
            {formatPercent(data.changePercent)}
          </p>
        </div>

        {/* Main condition label */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Market Condition
        </p>

        <motion.h2
          key={state}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
          className={`font-mono text-6xl font-black tracking-tight state-pulse ${meta.glowClass}`}
          style={{ color }}
        >
          {meta.label}
        </motion.h2>

        <p className="mt-3 text-sm text-text-secondary">{meta.sublabel}</p>
      </div>

      {/* ── Metrics (secondary) ───────────────────────────── */}
      <div className="grid grid-cols-3 divide-x divide-bg-border border-t border-bg-border">
        <MetricBox label="VWAP" value={formatNumber(data.vwap, 2)} />
        <MetricBox label="ATR" value={formatNumber(data.atr, 2)} color={color} />
        <MetricBox
          label="OI Flow"
          value={data.oi > data.prevOi ? '↑ Rising' : '↓ Falling'}
          color={data.oi > data.prevOi ? '#00E5A0' : '#FF3B6B'}
        />
      </div>

      {/* ── Signal lines ─────────────────────────────────── */}
      {signals.length > 0 && (
        <div className="border-t border-bg-border px-6 py-4 space-y-1.5">
          {signals.map((signal, i) => (
            <motion.div
              key={signal}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-2.5 text-xs text-text-secondary"
            >
              <span className="h-px w-3 shrink-0" style={{ backgroundColor: color, opacity: 0.6 }} />
              {signal}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function MetricBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-widest text-text-muted">{label}</p>
      <p className="mt-1.5 font-mono text-sm font-semibold" style={{ color: color || '#E6EDF3' }}>
        {value}
      </p>
    </div>
  )
}
