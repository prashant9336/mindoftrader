'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader } from '@/components/ui/Card'
import type { Trade } from '@/types'

interface MistakeAnalysisProps {
  trades: Trade[]
}

export function MistakeAnalysis({ trades: allTrades }: MistakeAnalysisProps) {
  const closedTrades = allTrades.filter((t) => t.status === 'closed')

  // Aggregate mistakes
  const mistakeCounts: Record<string, number> = {}
  const tipCounts: Record<string, number> = {}

  for (const trade of closedTrades) {
    for (const m of trade.mistakes || []) {
      mistakeCounts[m] = (mistakeCounts[m] || 0) + 1
    }
    for (const tip of trade.improvementTips || []) {
      tipCounts[tip] = (tipCounts[tip] || 0) + 1
    }
  }

  const topMistakes = Object.entries(mistakeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const topTips = Object.entries(tipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  // Win rate
  const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length
  const losses = closedTrades.filter((t) => (t.pnl ?? 0) <= 0).length
  const winRate = closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(1) : '0'

  // Rule obedience
  const obeyed = closedTrades.filter((t) => t.permissionStatus === 'ALLOWED').length
  const obedienceRate = closedTrades.length > 0 ? ((obeyed / closedTrades.length) * 100).toFixed(1) : '0'

  if (closedTrades.length === 0) {
    return (
      <Card>
        <CardHeader title="Mistake Analysis" subtitle="Post-trade truth engine" />
        <div className="flex flex-col items-center py-8 text-center">
          <span className="mb-3 text-3xl">🧠</span>
          <p className="text-sm text-text-secondary">No closed trades to analyze yet</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Mistake Analysis"
        subtitle="Post-trade truth engine"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        }
      />

      {/* Score Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <ScoreCard
          label="Win Rate"
          value={`${winRate}%`}
          sub={`${wins}W / ${losses}L`}
          color={parseFloat(winRate) >= 50 ? '#00E5A0' : '#FF3B6B'}
        />
        <ScoreCard
          label="Rule Obedience"
          value={`${obedienceRate}%`}
          sub={`${obeyed} of ${closedTrades.length} trades`}
          color={parseFloat(obedienceRate) >= 70 ? '#00E5A0' : '#F59E0B'}
        />
      </div>

      {/* Top Mistakes */}
      {topMistakes.length > 0 && (
        <div className="mb-5">
          <p className="mb-2.5 text-xs font-medium uppercase tracking-widest text-text-muted">
            Most Common Mistakes
          </p>
          <div className="space-y-2">
            {topMistakes.map(([mistake, count], i) => (
              <motion.div
                key={mistake}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start justify-between rounded-lg border border-state-blocked/15 bg-state-blocked/5 p-3"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-xs text-state-blocked">✗</span>
                  <p className="text-xs text-text-secondary">{mistake}</p>
                </div>
                <span className="ml-3 shrink-0 rounded-full bg-state-blocked/20 px-2 py-0.5 font-mono text-xs text-state-blocked">
                  ×{count}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Tips */}
      {topTips.length > 0 && (
        <div>
          <p className="mb-2.5 text-xs font-medium uppercase tracking-widest text-text-muted">
            Key Improvements
          </p>
          <div className="space-y-2">
            {topTips.map(([tip], i) => (
              <motion.div
                key={tip}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2 rounded-lg border border-state-allowed/15 bg-state-allowed/5 p-3"
              >
                <span className="mt-0.5 text-xs text-state-allowed">→</span>
                <p className="text-xs text-text-secondary">{tip}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function ScoreCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl bg-bg-primary/60 p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-text-muted">{sub}</p>
    </div>
  )
}
