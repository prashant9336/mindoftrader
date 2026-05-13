'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { TradeForm } from '@/components/trade/TradeForm'
import { PermissionIndicator } from '@/components/trade/PermissionIndicator'
import { MarketStatus } from '@/components/market/MarketStatus'
import { TradeLimitBlock, TradeLimitBar } from '@/components/behavior/TradeLimit'
import { useMarketState } from '@/hooks/useMarketState'
import { useBehavior } from '@/hooks/useBehavior'
import { useTradeEvaluator } from '@/hooks/useTradeEvaluator'
import { useTradeLimit } from '@/hooks/useTradeLimit'
import type { TradeEvaluation } from '@/types'
import { Card } from '@/components/ui/Card'

export default function TradePage() {
  const { result: market, loading: marketLoading } = useMarketState()
  const { behavior } = useBehavior()
  const { evaluation, setEvaluation, submitting, submitted, reset, submitTrade } = useTradeEvaluator()
  const { count: tradeCount, limit: tradeLimit, isAtLimit } = useTradeLimit()
  const [tradeData] = useState<{
    entryPrice: number; stopLoss: number; target: number; direction: string
  } | null>(null)

  const handleEvaluate = (ev: TradeEvaluation) => {
    setEvaluation(ev)
  }

  const handleConfirm = async () => {
    if (!tradeData) return
    await submitTrade(tradeData)
  }

  if (submitted) {
    return (
      <div className="page-enter">
        <Header title="Trade" subtitle="Submit and evaluate trades" />
        <div className="flex items-center justify-center p-6 sm:p-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-state-allowed/20 mx-auto">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-xl font-bold text-state-allowed">Trade Logged</h2>
            <p className="mt-2 text-sm text-text-secondary">Your trade has been recorded in the journal.</p>
            <button
              onClick={reset}
              className="mt-6 rounded-xl border border-bg-border bg-bg-card px-6 py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Evaluate Another Trade
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter">
      <Header title="Trade Evaluator" subtitle="Input your setup — system decides" />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Trade limit bar — always visible at top */}
        <div className="mb-5 flex items-center justify-between rounded-xl border border-bg-border bg-bg-card px-4 py-3">
          <TradeLimitBar count={tradeCount} limit={tradeLimit} isAtLimit={isAtLimit} />
          {isAtLimit && (
            <span className="ml-4 text-xs font-bold text-state-blocked">LIMIT HIT</span>
          )}
        </div>

        {/* Hard stop if at limit */}
        {isAtLimit ? (
          <TradeLimitBlock />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-5">
              <AnimatePresence mode="wait">
                {!evaluation ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <TradeForm
                      onEvaluate={handleEvaluate}
                      isLocked={behavior?.isLocked}
                      lockedUntil={behavior?.lockedUntil}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <PermissionIndicator
                      evaluation={evaluation}
                      onConfirm={handleConfirm}
                      onReset={reset}
                      submitting={submitting}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Rules Reminder */}
              <Card className="border-dashed">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">Trade Rules</p>
                <div className="space-y-2.5">
                  {[
                    ['R:R Minimum', '1:1 (ideal 1:1.5+)'],
                    ['Direction', 'Must align with market trend'],
                    ['Entry Timing', 'Within 1 ATR of current price'],
                    ['Market State', 'Avoid TRAP, reduce size in SIDEWAYS'],
                    ['After 2 Losses', '30-min mandatory cooling off'],
                  ].map(([rule, value]) => (
                    <div key={rule} className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">{rule}</span>
                      <span className="font-mono text-text-secondary">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column — market context */}
            <div>
              <MarketStatus result={market} loading={marketLoading} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
