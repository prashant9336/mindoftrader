'use client'

import { motion } from 'framer-motion'
import { LEVEL_CONFIG } from '@/lib/edgeScoreHelpers'
import type { EdgeBreakdown } from '@/types'

interface EdgeScoreProps {
  score: EdgeBreakdown
  /** Show avg stats label instead of "latest" */
  isAverage?: boolean
}

// ── SVG circular ring ─────────────────────────────────────────
function Ring({ value, size = 88, strokeWidth = 7, color }: {
  value: number; size?: number; strokeWidth?: number; color: string
}) {
  const r    = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#1C2333" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
        style={{ filter: `drop-shadow(0 0 5px ${color}70)` }}
      />
    </svg>
  )
}

// ── Sub-bar ───────────────────────────────────────────────────
function SubBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? '#00E5A0' : value >= 45 ? '#F59E0B' : '#FF3B6B'
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        <span className="font-mono font-semibold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-bg-border">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.4 }}
        />
      </div>
    </div>
  )
}

export function EdgeScore({ score, isAverage = false }: EdgeScoreProps) {
  const cfg   = LEVEL_CONFIG[score.level]
  const color = cfg.color

  return (
    <div className="rounded-xl border border-bg-border bg-bg-card p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
          {isAverage ? 'Avg Edge Score' : 'Edge Score'}
        </p>

        {/* Level badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ backgroundColor: cfg.bg, border: `1px solid ${color}30` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-mono text-[10px] font-bold tracking-widest" style={{ color }}>
            {score.level}
          </span>
        </motion.div>
      </div>

      <div className="flex items-center gap-5">
        {/* Ring + number */}
        <div className="relative shrink-0">
          <Ring value={score.total} size={88} strokeWidth={7} color={color} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="font-mono text-2xl font-black leading-none"
              style={{ color }}
            >
              {score.total}
            </motion.span>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">
              / 100
            </span>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="flex-1 space-y-2.5">
          <SubBar label="Discipline"   value={score.discipline} />
          <SubBar label="Timing"       value={score.timing} />
          <SubBar label="Risk Control" value={score.risk} />
          <SubBar label="Consistency"  value={score.consistency} />
        </div>
      </div>

      {/* Top penalties */}
      {score.penalties.length > 0 && (
        <div className="mt-4 space-y-1 border-t border-bg-border pt-4">
          {score.penalties.slice(0, 3).map((p) => (
            <p key={p} className="flex items-center gap-2 text-xs text-text-muted">
              <span className="text-state-blocked">↓</span>
              {p}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
