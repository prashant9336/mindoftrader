'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader } from '@/components/ui/Card'
import type { Trade } from '@/types'

interface InsightsPanelProps {
  trades: Trade[]
}

interface Insight {
  icon: string
  headline: string
  detail: string
  color: string
}

function deriveInsights(trades: Trade[]): Insight[] {
  const closed = trades.filter((t) => t.status === 'closed')
  if (closed.length < 2) return []

  const insights: Insight[] = []

  // ── Edge score trend ──────────────────────────────────────
  const scored = closed.filter((t) => t.edgeScore !== undefined)
  if (scored.length >= 3) {
    const recent3 = scored.slice(0, 3).map((t) => t.edgeScore!)
    const prev3   = scored.slice(3, 6).map((t) => t.edgeScore!)
    if (prev3.length >= 1) {
      const recentAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length
      const prevAvg   = prev3.reduce((a, b) => a + b, 0) / prev3.length
      const delta     = recentAvg - prevAvg
      if (Math.abs(delta) >= 5) {
        insights.push({
          icon: delta > 0 ? '↑' : '↓',
          headline: delta > 0 ? 'Edge score improving' : 'Edge score declining',
          detail: `${Math.abs(Math.round(delta))} pts ${delta > 0 ? 'higher' : 'lower'} vs previous trades`,
          color: delta > 0 ? '#00E5A0' : '#FF3B6B',
        })
      }
    }
  }

  // ── Worst market state ─────────────────────────────────────
  const byState: Record<string, { losses: number; total: number }> = {}
  for (const t of closed) {
    if (!byState[t.marketState]) byState[t.marketState] = { losses: 0, total: 0 }
    byState[t.marketState].total++
    if ((t.pnl ?? 0) < 0) byState[t.marketState].losses++
  }
  const stateEntries = Object.entries(byState).filter(([, v]) => v.total >= 2)
  if (stateEntries.length > 0) {
    const [worstState, worstData] = stateEntries
      .sort((a, b) => b[1].losses / b[1].total - a[1].losses / a[1].total)[0]
    const lossRate = Math.round((worstData.losses / worstData.total) * 100)
    if (lossRate >= 50) {
      insights.push({
        icon: '⚠',
        headline: `Weak in ${worstState} markets`,
        detail: `${lossRate}% loss rate when market is ${worstState.toLowerCase()} (${worstData.total} trades)`,
        color: '#F59E0B',
      })
    }
  }

  // ── Discipline pattern ────────────────────────────────────
  const blockedTaken = closed.filter(
    (t) => t.permissionStatus === 'BLOCKED'
  ).length
  if (blockedTaken > 0) {
    const avgScoreOnBlocked = scored
      .filter((t) => t.permissionStatus === 'BLOCKED')
      .reduce((s, t) => s + t.edgeScore!, 0) / (blockedTaken || 1)
    insights.push({
      icon: '✗',
      headline: `${blockedTaken} blocked trade${blockedTaken > 1 ? 's' : ''} taken`,
      detail: `Avg edge score on these: ${Math.round(avgScoreOnBlocked)}. Trust the system.`,
      color: '#FF3B6B',
    })
  }

  // ── Best discipline runs ──────────────────────────────────
  const allowedRun = closed.filter((t) => t.permissionStatus === 'ALLOWED').length
  const totalClosed = closed.length
  const disciplineRate = Math.round((allowedRun / totalClosed) * 100)
  if (disciplineRate >= 80 && totalClosed >= 3) {
    insights.push({
      icon: '★',
      headline: 'Excellent rule obedience',
      detail: `${disciplineRate}% of trades followed system rules. This is elite-level discipline.`,
      color: '#00E5A0',
    })
  }

  // ── Consistency pattern ───────────────────────────────────
  const avgRR = closed.reduce((s, t) => s + (t.rrRatio || 0), 0) / (closed.length || 1)
  if (avgRR >= 1.5) {
    insights.push({
      icon: '↗',
      headline: 'Strong risk management',
      detail: `Average R:R of ${avgRR.toFixed(2)}:1 across ${totalClosed} trades. Keep it above 1.5.`,
      color: '#4F8EF7',
    })
  } else if (avgRR < 1) {
    insights.push({
      icon: '↘',
      headline: 'R:R needs improvement',
      detail: `Average R:R is only ${avgRR.toFixed(2)}:1. Target minimum 1.5:1 before entering.`,
      color: '#FF3B6B',
    })
  }

  return insights.slice(0, 4)
}

export function InsightsPanel({ trades }: InsightsPanelProps) {
  const insights = useMemo(() => deriveInsights(trades), [trades])

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader title="Pattern Insights" subtitle="Behavioral analysis" />
        <div className="flex flex-col items-center py-8 text-center">
          <p className="text-sm text-text-secondary">
            Complete at least 2 closed trades to unlock pattern analysis.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Pattern Insights"
        subtitle="Derived from your trade history"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4l-5 5-4-4-6 6" />
          </svg>
        }
      />

      <div className="space-y-3">
        {insights.map((ins, i) => (
          <motion.div
            key={ins.headline}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-start gap-3 rounded-xl p-3"
            style={{
              backgroundColor: `${ins.color}08`,
              border: `1px solid ${ins.color}20`,
            }}
          >
            <span
              className="mt-0.5 shrink-0 font-mono text-sm font-bold"
              style={{ color: ins.color }}
            >
              {ins.icon}
            </span>
            <div>
              <p className="text-xs font-semibold" style={{ color: ins.color }}>
                {ins.headline}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                {ins.detail}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  )
}
