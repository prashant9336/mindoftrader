'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { TradeHistory } from '@/components/journal/TradeHistory'
import { MistakeAnalysis } from '@/components/journal/MistakeAnalysis'
import { InsightsPanel } from '@/components/journal/InsightsPanel'
import { StatCard } from '@/components/ui/Card'
import type { Trade } from '@/types'
import { DEMO_USER_ID } from '@/lib/supabase'

function mapTrade(t: Record<string, unknown>): Trade {
  return {
    id:               t.id              as string,
    userId:           t.user_id         as string,
    symbol:           t.symbol          as string,
    direction:        t.direction        as Trade['direction'],
    entryPrice:       t.entry_price      as number,
    exitPrice:        t.exit_price       as number | undefined,
    stopLoss:         t.stop_loss        as number,
    target:           t.target           as number,
    quantity:         t.quantity         as number,
    pnl:              t.pnl              as number | undefined,
    permissionStatus: t.permission_status as Trade['permissionStatus'],
    marketState:      t.market_state      as Trade['marketState'],
    status:           t.status            as Trade['status'],
    blockReasons:     t.block_reasons     as string[] | undefined,
    mistakes:         t.mistakes          as string[] | undefined,
    improvementTips:  t.improvement_tips  as string[] | undefined,
    rrRatio:          t.rr_ratio          as number,
    // Edge score columns (populated after migration 001)
    disciplineScore:  t.discipline_score  as number | undefined,
    timingScore:      t.timing_score      as number | undefined,
    riskScore:        t.risk_score        as number | undefined,
    consistencyScore: t.consistency_score as number | undefined,
    edgeScore:        t.edge_score        as number | undefined,
    createdAt:        t.created_at        as string,
    closedAt:         t.closed_at         as string | undefined,
  }
}

export default function JournalPage() {
  const [trades,  setTrades]  = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTrades = useCallback(async () => {
    try {
      const res  = await fetch(`/api/journal?userId=${DEMO_USER_ID}`)
      const data = await res.json()
      if (res.ok) setTrades((data.trades || []).map(mapTrade))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTrades() }, [fetchTrades])

  const handleCloseTrade = async (tradeId: string, exitPrice: number) => {
    const res = await fetch('/api/journal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradeId, exitPrice, userId: DEMO_USER_ID }),
    })
    if (res.ok) fetchTrades()
  }

  const closedTrades = trades.filter((t) => t.status === 'closed')
  const totalPnl     = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const wins         = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length
  const winRate      = closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(1) : '0'

  const avgEdgeScore = useMemo(() => {
    const scored = trades.filter((t) => t.edgeScore !== undefined)
    if (scored.length === 0) return null
    return Math.round(scored.reduce((s, t) => s + t.edgeScore!, 0) / scored.length)
  }, [trades])

  return (
    <div className="page-enter">
      <Header title="Trade Journal" subtitle="Post-trade truth engine" />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
        >
          <StatCard
            label="Total P&L"
            value={`${totalPnl >= 0 ? '+' : ''}₹${Math.abs(totalPnl).toFixed(0)}`}
            subtext={`${closedTrades.length} closed trades`}
            trend={totalPnl >= 0 ? 'up' : 'down'}
            color={totalPnl >= 0 ? '#00E5A0' : '#FF3B6B'}
          />
          <StatCard
            label="Win Rate"
            value={`${winRate}%`}
            subtext={`${wins} wins of ${closedTrades.length}`}
            trend={parseFloat(winRate) >= 50 ? 'up' : 'down'}
          />
          <StatCard
            label="Avg Edge Score"
            value={avgEdgeScore !== null ? avgEdgeScore : '—'}
            subtext={avgEdgeScore !== null
              ? (avgEdgeScore >= 80 ? 'Elite process' : avgEdgeScore >= 60 ? 'Skilled process' : 'Needs work')
              : 'No scored trades yet'}
            trend={avgEdgeScore !== null ? (avgEdgeScore >= 60 ? 'up' : 'down') : 'neutral'}
            color={avgEdgeScore !== null ? (avgEdgeScore >= 60 ? '#00E5A0' : avgEdgeScore >= 40 ? '#F59E0B' : '#FF3B6B') : undefined}
          />
          <StatCard
            label="Blocked & Taken"
            value={trades.filter((t) => t.permissionStatus === 'BLOCKED' && t.status !== 'cancelled').length}
            subtext="Rule violations"
            trend="down"
            color="#FF3B6B"
          />
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Trade History — spans 2 cols */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <TradeHistory
              trades={trades}
              loading={loading}
              onCloseTrade={handleCloseTrade}
            />
          </motion.div>

          {/* Right column: Insights + Mistake Analysis */}
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <InsightsPanel trades={trades} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <MistakeAnalysis trades={trades} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
