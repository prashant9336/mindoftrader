'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { MarketStatus } from '@/components/market/MarketStatus'
import { StatCard } from '@/components/ui/Card'
import { EdgeScore } from '@/components/behavior/EdgeScore'
import { DailyCheckin } from '@/components/behavior/DailyCheckin'
import { TradeLimitBar } from '@/components/behavior/TradeLimit'
import { useMarketState } from '@/hooks/useMarketState'
import { useBehavior } from '@/hooks/useBehavior'
import { useDailyCheckin } from '@/hooks/useDailyCheckin'
import { useDisciplineStreak } from '@/hooks/useDisciplineStreak'
import { useTradeLimit } from '@/hooks/useTradeLimit'
import { useEdgeScore } from '@/hooks/useEdgeScore'
import { useEdgeStats } from '@/hooks/useEdgeStats'
import { getLatestVerdict, subscribe as busSubscribe } from '@/lib/coachMessageBus'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { formatNumber } from '@/lib/utils'
import type { MarketState, BehaviorStatus, CoachMessage } from '@/types'

const FADE_UP = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

// ── System Verdict Strip ──────────────────────────────────────────────────────
const VERDICTS: Record<MarketState, { color: string; bg: string; border: string; icon: string; headline: string; body: string }> = {
  TRENDING: {
    color: '#00E5A0',
    bg: 'rgba(0, 229, 160, 0.05)',
    border: 'rgba(0, 229, 160, 0.2)',
    icon: '▲',
    headline: 'DIRECTIONAL CONDITIONS ACTIVE',
    body: 'Market has structure. Trade only in the direction of the trend. Quality entries near VWAP.',
  },
  SIDEWAYS: {
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.05)',
    border: 'rgba(245, 158, 11, 0.2)',
    icon: '⚠',
    headline: 'LOW CONVICTION ENVIRONMENT',
    body: 'High probability of fake moves and whipsaws. Avoid directional trades until a clear breakout forms.',
  },
  TRAP: {
    color: '#FF3B6B',
    bg: 'rgba(255, 59, 107, 0.06)',
    border: 'rgba(255, 59, 107, 0.25)',
    icon: '⚡',
    headline: 'TRAP CONDITION DETECTED',
    body: 'Smart money is hunting stops. Price spike without OI support. Stay flat. Protect your capital.',
  },
}

function SystemVerdictStrip({ state }: { state: MarketState }) {
  const v = VERDICTS[state]
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 flex items-start gap-3 rounded-2xl border px-4 py-4 sm:gap-4 sm:px-6"
      style={{ backgroundColor: v.bg, borderColor: v.border }}
    >
      <motion.span
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="mt-0.5 shrink-0 text-base sm:text-lg"
        style={{ color: v.color }}
      >
        {v.icon}
      </motion.span>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em]" style={{ color: v.color }}>
          System Verdict · {v.headline}
        </p>
        <p className="mt-1 text-sm text-text-secondary leading-relaxed">{v.body}</p>
      </div>
    </motion.div>
  )
}

// ── Behavior Card ─────────────────────────────────────────────────────────────
function BehaviorCard({ behavior, loading, tradeCount, tradeLimit, isAtLimit }: {
  behavior: BehaviorStatus | null
  loading: boolean
  tradeCount: number
  tradeLimit: number
  isAtLimit: boolean
}) {
  if (loading || !behavior) {
    return <div className="h-64 animate-pulse rounded-xl bg-bg-card border border-bg-border" />
  }

  const statusColor = behavior.isLocked ? '#FF3B6B' : behavior.revengeRisk ? '#F59E0B' : '#00E5A0'
  const statusText = behavior.isLocked ? 'LOCKED' : behavior.revengeRisk ? 'CAUTION' : 'ACTIVE'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-xl border border-bg-border bg-bg-card p-5 card-interactive"
      style={behavior.isLocked ? { borderColor: 'rgba(255,59,107,0.3)', boxShadow: '0 0 24px rgba(255,59,107,0.1)' } : {}}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Discipline Engine</p>
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span className="font-mono text-xs font-bold" style={{ color: statusColor }}>
            {statusText}
          </span>
        </div>
      </div>

      {/* Trade limit bar */}
      <div className="mb-4 rounded-lg bg-bg-primary/60 px-3 py-2.5">
        <TradeLimitBar count={tradeCount} limit={tradeLimit} isAtLimit={isAtLimit} />
      </div>

      <div className="space-y-3">
        <BehaviorRow label="Trades today" value={`${behavior.tradesToday}`} />
        <BehaviorRow
          label="Consecutive losses"
          value={`${behavior.consecutiveLosses}`}
          color={behavior.consecutiveLosses >= 2 ? '#FF3B6B' : behavior.consecutiveLosses === 1 ? '#F59E0B' : undefined}
        />
        <BehaviorRow
          label="Revenge risk"
          value={behavior.revengeRisk ? 'HIGH' : 'Clear'}
          color={behavior.revengeRisk ? '#F59E0B' : undefined}
        />
        {behavior.lockedUntil && (
          <BehaviorRow
            label="Unlocks at"
            value={new Date(behavior.lockedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            color="#FF3B6B"
          />
        )}
      </div>

      {behavior.warningMessages.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-bg-border pt-4">
          {behavior.warningMessages.map((msg) => (
            <p key={msg} className="text-xs leading-relaxed text-state-risky">
              <span className="mr-1.5">⚠</span>{msg}
            </p>
          ))}
        </div>
      )}

      {!behavior.isLocked && behavior.consecutiveLosses === 0 && behavior.tradesToday === 0 && (
        <p className="mt-4 border-t border-bg-border pt-4 text-xs italic text-text-muted">
          "No trades today. Patience is an edge."
        </p>
      )}
      {behavior.revengeRisk && (
        <p className="mt-4 border-t border-bg-border pt-4 text-xs italic text-state-risky">
          "You are forcing trades. Stop."
        </p>
      )}
    </motion.div>
  )
}

function BehaviorRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="font-mono text-sm font-semibold" style={{ color: color || '#E6EDF3' }}>
        {value}
      </span>
    </div>
  )
}

// ── Latest Verdict Strip ──────────────────────────────────────────────────────
const VERDICT_COLORS: Record<CoachMessage['type'], { color: string; bg: string; border: string; label: string }> = {
  success: { color: '#00E5A0', bg: 'rgba(0,229,160,0.05)',  border: 'rgba(0,229,160,0.2)',  label: 'INSIGHT' },
  info:    { color: '#4F8EF7', bg: 'rgba(79,142,247,0.05)', border: 'rgba(79,142,247,0.2)', label: 'INTEL'   },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.2)', label: 'CAUTION' },
  alert:   { color: '#FF3B6B', bg: 'rgba(255,59,107,0.06)', border: 'rgba(255,59,107,0.25)', label: 'ALERT'  },
}

function LatestVerdictStrip({ verdict }: { verdict: CoachMessage }) {
  const v = VERDICT_COLORS[verdict.type]
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4 flex items-start gap-3 rounded-xl border px-4 py-3"
      style={{ backgroundColor: v.bg, borderColor: v.border }}
    >
      <motion.span
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: v.color }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold tracking-widest" style={{ color: v.color }}>
          MENTOR · {v.label}
        </span>
        <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{verdict.message}</p>
      </div>
    </motion.div>
  )
}

// ── Alerts toggle button (shown in Header) ────────────────────────────────────
function AlertsButton() {
  const { state, subscribe, unsubscribe } = usePushNotifications()

  if (state === 'unsupported') return null

  const isOn      = state === 'subscribed'
  const isLoading = state === 'loading'
  const isDenied  = state === 'denied'

  return (
    <button
      onClick={isOn ? unsubscribe : subscribe}
      disabled={isLoading || isDenied}
      title={
        isDenied   ? 'Notifications blocked — allow them in browser settings' :
        isOn       ? 'FVG alerts ON — click to disable' :
        isLoading  ? 'Loading...' :
        'Enable FVG signal alerts'
      }
      className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all"
      style={{
        borderColor:     isOn ? 'rgba(0,229,160,0.3)' : 'rgba(125,133,144,0.3)',
        color:           isDenied ? '#7D8590' : isOn ? '#00E5A0' : '#7D8590',
        backgroundColor: isOn ? 'rgba(0,229,160,0.08)' : 'transparent',
        cursor:          isDenied ? 'not-allowed' : 'pointer',
        opacity:         isLoading ? 0.5 : 1,
      }}
    >
      <span>{isOn ? '🔔' : '🔕'}</span>
      <span>{isOn ? 'Alerts On' : isDenied ? 'Blocked' : 'Alerts Off'}</span>
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { result: market, loading: marketLoading } = useMarketState()
  const { behavior, loading: behaviorLoading } = useBehavior()
  const { showCheckin, dismiss } = useDailyCheckin()
  const { streak } = useDisciplineStreak()
  const { count: tradeCount, limit: tradeLimit, isAtLimit } = useTradeLimit()
  // Try API-sourced stats first; fall back to local estimation
  const { stats, latestScore, loading: statsLoading } = useEdgeStats()
  const localEdgeScore = useEdgeScore({ behavior, tradesToday: tradeCount, rrAvg: 1.3 })
  const edgeScore = latestScore ?? localEdgeScore

  const [latestVerdict, setLatestVerdict] = useState<CoachMessage | null>(null)
  useEffect(() => {
    setLatestVerdict(getLatestVerdict())
    return busSubscribe(() => setLatestVerdict(getLatestVerdict()))
  }, [])

  return (
    <div className="page-enter">
      <Header title="Command Center" subtitle="System overview">
        <AlertsButton />
      </Header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Daily check-in — shows once per day */}
        {showCheckin && (
          <DailyCheckin
            marketState={market?.state ?? null}
            tradesToday={tradeCount}
            tradeLimit={tradeLimit}
            streak={streak}
            onDismiss={dismiss}
          />
        )}

        {/* Latest mentor verdict from trade evaluation */}
        {latestVerdict && <LatestVerdictStrip verdict={latestVerdict} />}

        {/* System Verdict Strip */}
        {market && <SystemVerdictStrip state={market.state} />}
        {!market && (
          <div className="mb-6 h-16 animate-pulse rounded-2xl bg-bg-card border border-bg-border" />
        )}

        {/* Main Grid — Market dominates */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <motion.div
            {...FADE_UP}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <MarketStatus result={market} loading={marketLoading} />
          </motion.div>

          <BehaviorCard
            behavior={behavior}
            loading={behaviorLoading}
            tradeCount={tradeCount}
            tradeLimit={tradeLimit}
            isAtLimit={isAtLimit}
          />
        </div>

        {/* Edge Score */}
        <motion.div
          {...FADE_UP}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-5"
        >
          {!statsLoading && (
            <EdgeScore
              score={stats
                ? {
                    discipline:  stats.disciplineAvg,
                    timing:      stats.timingAvg,
                    risk:        stats.riskAvg,
                    consistency: stats.consistencyAvg,
                    total:       stats.avgEdgeScore,
                    level:       edgeScore.level,
                    penalties:   [],
                  }
                : edgeScore}
              isAverage={!!stats}
            />
          )}
          {statsLoading && (
            <div className="h-36 animate-pulse rounded-xl bg-bg-card border border-bg-border" />
          )}
        </motion.div>

        {/* Secondary stats — deliberately muted */}
        <motion.div
          {...FADE_UP}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-5 grid grid-cols-2 gap-3 opacity-75 lg:grid-cols-4 lg:gap-4"
        >
          <StatCard
            label="Trades Today"
            value={behavior?.tradesToday ?? 0}
            subtext={behavior && behavior.tradesToday >= 3 ? 'High frequency — slow down' : 'Within limits'}
            trend={behavior && behavior.tradesToday >= 3 ? 'down' : 'neutral'}
          />
          <StatCard
            label="Consecutive Losses"
            value={behavior?.consecutiveLosses ?? 0}
            subtext={behavior && behavior.consecutiveLosses >= 2 ? 'Lock triggered' : 'OK'}
            trend={behavior && behavior.consecutiveLosses >= 1 ? 'down' : 'neutral'}
            color={behavior && behavior.consecutiveLosses >= 2 ? '#FF3B6B' : undefined}
          />
          <StatCard
            label="ATR"
            value={market ? formatNumber(market.data.atr, 1) : '—'}
            subtext={market ? (market.data.atr > market.data.prevAtr ? '↑ Expanding' : '↓ Contracting') : ''}
            trend={market ? (market.data.atr > market.data.prevAtr ? 'up' : 'down') : 'neutral'}
          />
          <StatCard
            label="Price vs VWAP"
            value={market ? `${market.data.price > market.data.vwap ? '+' : ''}${formatNumber(market.data.price - market.data.vwap, 1)}` : '—'}
            subtext={market ? (market.data.price > market.data.vwap ? 'Above VWAP' : 'Below VWAP') : ''}
            trend={market ? (market.data.price > market.data.vwap ? 'up' : 'down') : 'neutral'}
          />
        </motion.div>

        {/* System Principles */}
        <motion.div
          {...FADE_UP}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="mt-5 rounded-xl border border-bg-border bg-bg-card px-5 py-4"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
            System Principles
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              'Discipline protected your capital today.',
              'One quality trade outperforms ten average ones.',
              'R:R below 1:1 is not a trade. It is a donation.',
              'The market does not care about your P&L targets.',
            ].map((line) => (
              <p key={line} className="flex items-start gap-2 text-xs text-text-muted">
                <span className="mt-0.5 text-accent-blue opacity-60">—</span>
                <span className="italic">{line}</span>
              </p>
            ))}
          </div>
        </motion.div>

        {/* CTA to Trade screen */}
        <motion.div
          {...FADE_UP}
          transition={{ duration: 0.4, delay: 0.55 }}
          className="mt-5 flex justify-center"
        >
          <Link
            href="/trade"
            className="btn-gradient inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white"
          >
            Evaluate a Trade
            <span className="text-white/70">→</span>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
