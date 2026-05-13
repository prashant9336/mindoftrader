'use client'

import { motion } from 'framer-motion'
import { LEVEL_CONFIG } from '@/lib/edgeScoreHelpers'
import type { EdgeBreakdown } from '@/types'

interface EdgeScorePanelProps {
  score: EdgeBreakdown
  borderColor: string
}

function MiniBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? '#00E5A0' : value >= 45 ? '#F59E0B' : '#FF3B6B'
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-text-muted">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-border">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
        />
      </div>
      <span className="w-7 shrink-0 text-right font-mono text-xs font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  )
}

export function EdgeScorePanel({ score, borderColor }: EdgeScorePanelProps) {
  const cfg = LEVEL_CONFIG[score.level]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="border-t px-6 py-5"
      style={{ borderColor }}
    >
      {/* Section label + score + level */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">
          Edge Score
        </p>
        <div className="flex items-center gap-3">
          {/* Level badge */}
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}30` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
            <span className="font-mono text-[10px] font-bold tracking-widest" style={{ color: cfg.color }}>
              {score.level}
            </span>
          </div>
          {/* Score number */}
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 260 }}
            className="font-mono text-2xl font-black"
            style={{ color: cfg.color }}
          >
            {score.total}
          </motion.span>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-2.5">
        <MiniBar label="Discipline"   value={score.discipline} />
        <MiniBar label="Timing"       value={score.timing} />
        <MiniBar label="Risk Control" value={score.risk} />
        <MiniBar label="Consistency"  value={score.consistency} />
      </div>

      {/* Penalties */}
      {score.penalties.length > 0 && (
        <div className="mt-4 space-y-1">
          {score.penalties.slice(0, 3).map((p) => (
            <p key={p} className="flex items-center gap-2 text-xs text-text-muted">
              <span className="text-state-blocked">↓</span> {p}
            </p>
          ))}
        </div>
      )}

    </motion.div>
  )
}
