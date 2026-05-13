'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader } from '@/components/ui/Card'
import { PermissionBadge, MarketStateBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LEVEL_CONFIG, getLevel } from '@/lib/edgeScoreHelpers'
import type { Trade } from '@/types'
import { formatDate, formatNumber, cn } from '@/lib/utils'
import { useState } from 'react'

interface TradeHistoryProps {
  trades: Trade[]
  loading?: boolean
  onCloseTrade?: (tradeId: string, exitPrice: number) => void
}

export function TradeHistory({ trades, loading, onCloseTrade }: TradeHistoryProps) {
  const [closingId, setClosingId] = useState<string | null>(null)
  const [exitPrice, setExitPrice] = useState('')

  const handleClose = async (tradeId: string) => {
    if (!exitPrice || !onCloseTrade) return
    onCloseTrade(tradeId, parseFloat(exitPrice))
    setClosingId(null)
    setExitPrice('')
  }

  return (
    <Card>
      <CardHeader
        title="Trade Journal"
        subtitle={`${trades.length} recorded trades`}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        }
      />

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-bg-border" />
          ))}
        </div>
      )}

      {!loading && trades.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <motion.div
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mb-5 h-px w-16 bg-gradient-to-r from-transparent via-text-muted to-transparent"
          />
          <p className="text-base font-semibold text-text-primary">Your trading journey starts here</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-text-secondary">
            Every trade will be analyzed for quality, timing, and alignment with your rules.
          </p>
          <p className="mt-4 text-xs text-text-muted italic">
            "No record means no improvement. Take your first evaluated trade."
          </p>
          <a
            href="/trade"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-accent-blue/30 bg-accent-blue/10 px-5 py-2.5 text-sm font-medium text-accent-blue transition-all hover:bg-accent-blue/15 hover:border-accent-blue/50"
          >
            Take your first evaluated trade →
          </a>
        </div>
      )}

      <div className="space-y-2.5">
        {trades.map((trade, i) => (
          <motion.div
            key={trade.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-bg-border bg-bg-primary/40 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-sm font-bold text-text-primary">{trade.symbol}</span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: trade.direction === 'CALL' || trade.direction === 'LONG' ? '#00E5A0' : '#FF3B6B' }}
                  >
                    {trade.direction}
                  </span>
                  <PermissionBadge status={trade.permissionStatus} size="sm" />
                  <MarketStateBadge state={trade.marketState} size="sm" />
                  {/* Edge Score badge */}
                  {trade.edgeScore !== undefined && (
                    <EdgeScoreBadge score={trade.edgeScore} />
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-text-muted">
                  <span>Entry <span className="font-mono text-text-secondary">{formatNumber(trade.entryPrice, 2)}</span></span>
                  <span>SL <span className="font-mono text-state-blocked">{formatNumber(trade.stopLoss, 2)}</span></span>
                  <span>Target <span className="font-mono text-state-allowed">{formatNumber(trade.target, 2)}</span></span>
                  <span>R:R <span className="font-mono text-text-secondary">1:{trade.rrRatio}</span></span>
                </div>

                {trade.mistakes && trade.mistakes.length > 0 && (
                  <div className="mt-2">
                    {trade.mistakes.map((m) => (
                      <span key={m} className="mr-1 inline-block rounded-md bg-state-blocked/10 px-2 py-0.5 text-xs text-state-blocked">
                        {m.slice(0, 40)}...
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right */}
              <div className="shrink-0 text-right">
                {trade.pnl !== undefined ? (
                  <p className={cn('font-mono text-base font-bold', trade.pnl >= 0 ? 'text-state-allowed' : 'text-state-blocked')}>
                    {trade.pnl >= 0 ? '+' : ''}₹{formatNumber(trade.pnl, 0)}
                  </p>
                ) : (
                  trade.status === 'open' && onCloseTrade && (
                    closingId === trade.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={exitPrice}
                          onChange={(e) => setExitPrice(e.target.value)}
                          placeholder="Exit"
                          className="w-24 rounded-lg border border-bg-border bg-bg-primary px-2 py-1 font-mono text-xs text-text-primary"
                        />
                        <Button size="sm" variant="success" onClick={() => handleClose(trade.id)}>✓</Button>
                        <Button size="sm" variant="ghost" onClick={() => setClosingId(null)}>✗</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setClosingId(trade.id)}>
                        Close
                      </Button>
                    )
                  )
                )}
                <p className="mt-1 text-xs text-text-muted">{formatDate(trade.createdAt)}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  )
}

function EdgeScoreBadge({ score }: { score: number }) {
  const level = getLevel(score)
  const cfg   = LEVEL_CONFIG[level]
  return (
    <span
      className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold"
      style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
      title={`Edge Score: ${score} — ${level}`}
    >
      {score}
    </span>
  )
}
