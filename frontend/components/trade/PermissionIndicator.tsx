'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { EdgeScorePanel } from '@/components/trade/EdgeScorePanel'
import type { CoachMessage, TradeEvaluation } from '@/types'
import { formatNumber } from '@/lib/utils'
import { publishMessages } from '@/lib/coachMessageBus'

interface PermissionIndicatorProps {
  evaluation: TradeEvaluation | null
  onConfirm?: () => void
  onReset?: () => void
  submitting?: boolean
}

const VERDICT_CONFIG = {
  ALLOWED: {
    color: '#00E5A0',
    bg: 'rgba(0, 229, 160, 0.06)',
    border: 'rgba(0, 229, 160, 0.2)',
    glow: '0 0 60px rgba(0, 229, 160, 0.15), 0 0 120px rgba(0, 229, 160, 0.06)',
    icon: '✓',
    title: 'TRADE APPROVED',
    subtitle: 'All conditions met. Execute with discipline.',
    confirmLabel: 'Log This Trade',
    confirmVariant: 'success' as const,
    shake: false,
  },
  RISKY: {
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.05)',
    border: 'rgba(245, 158, 11, 0.2)',
    glow: '0 0 60px rgba(245, 158, 11, 0.12)',
    icon: '⚠',
    title: 'PROCEED WITH CAUTION',
    subtitle: 'Marginal conditions. Reduce position size.',
    confirmLabel: 'Accept Risk',
    confirmVariant: 'secondary' as const,
    shake: false,
  },
  BLOCKED: {
    color: '#FF3B6B',
    bg: 'rgba(255, 59, 107, 0.07)',
    border: 'rgba(255, 59, 107, 0.25)',
    glow: '0 0 60px rgba(255, 59, 107, 0.2), 0 0 120px rgba(255, 59, 107, 0.08)',
    icon: '✗',
    title: 'TRADE BLOCKED',
    subtitle: 'This trade violates your rules. The system has spoken.',
    confirmLabel: null,
    confirmVariant: 'danger' as const,
    shake: true,
  },
}

export function PermissionIndicator({ evaluation, onConfirm, onReset, submitting }: PermissionIndicatorProps) {
  useEffect(() => {
    if (evaluation?.coachMessages?.length) {
      publishMessages(evaluation.coachMessages)
    }
  }, [evaluation])

  if (!evaluation) return null

  const cfg = VERDICT_CONFIG[evaluation.permission]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={evaluation.permission}
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={
          cfg.shake
            ? { opacity: 1, scale: 1, y: 0, x: [0, -12, 12, -10, 10, -6, 6, -2, 2, 0] }
            : { opacity: 1, scale: 1, y: 0 }
        }
        exit={{ opacity: 0, scale: 0.96 }}
        transition={cfg.shake
          ? { duration: 0.55, x: { duration: 0.55, ease: 'easeInOut' } }
          : { duration: 0.3, type: 'spring', stiffness: 200 }
        }
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: cfg.bg, borderColor: cfg.border, boxShadow: cfg.glow }}
      >
        {/* ── Verdict hero ───────────────────────────────── */}
        <div
          className="flex flex-col items-center py-10 text-center px-6"
          style={{ background: `radial-gradient(ellipse 60% 70% at 50% 0%, ${cfg.color}0A 0%, transparent 70%)` }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
            style={{ backgroundColor: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
          >
            {cfg.icon}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="font-mono text-3xl font-black tracking-widest"
            style={{ color: cfg.color }}
          >
            {cfg.title}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22 }}
            className="mt-2 text-sm text-text-secondary max-w-xs"
          >
            {cfg.subtitle}
          </motion.p>
        </div>

        {/* ── Metrics row ────────────────────────────────── */}
        <div
          className="grid grid-cols-3 divide-x border-t"
          style={{ borderColor: cfg.border, '--divide-color': cfg.border } as React.CSSProperties}
        >
          <VerdictMetric
            label="R:R"
            value={`1 : ${evaluation.rrRatio}`}
            color={evaluation.rrRatio >= 1.5 ? '#00E5A0' : evaluation.rrRatio >= 1 ? '#F59E0B' : '#FF3B6B'}
          />
          <VerdictMetric label="Risk"   value={`₹${formatNumber(evaluation.riskAmount, 0)}`}   color="#FF3B6B" />
          <VerdictMetric label="Reward" value={`₹${formatNumber(evaluation.rewardAmount, 0)}`} color="#00E5A0" />
        </div>

        {/* ── Reason list ────────────────────────────────── */}
        <div className="border-t px-6 py-5" style={{ borderColor: cfg.border }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">
            {evaluation.permission === 'ALLOWED' ? 'Why this trade qualifies' : 'Violations found'}
          </p>
          <div className="space-y-2">
            {evaluation.reasons.map((reason, i) => (
              <motion.div
                key={reason}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                className="flex items-start gap-3"
              >
                <span className="mt-0.5 shrink-0 text-xs font-bold" style={{ color: cfg.color }}>
                  {evaluation.permission === 'ALLOWED' ? '✓' : '✗'}
                </span>
                <p className="text-xs leading-relaxed text-text-secondary">{reason}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Edge Score breakdown ────────────────────────── */}
        {evaluation.edgeScore && (
          <EdgeScorePanel
            score={evaluation.edgeScore}
            borderColor={cfg.border}
          />
        )}

        {/* ── Market context ─────────────────────────────── */}
        <div className="border-t px-6 py-3" style={{ borderColor: cfg.border }}>
          <p className="text-xs text-text-muted">
            Context:{' '}
            <span className="font-mono font-semibold" style={{ color: cfg.color }}>
              {evaluation.marketState}
            </span>
            {' · '}
            Price <span className="font-mono text-text-primary">{formatNumber(evaluation.marketData.price, 2)}</span>
            {' · '}
            VWAP <span className="font-mono text-text-primary">{formatNumber(evaluation.marketData.vwap, 2)}</span>
          </p>
        </div>

        {/* ── Coach messages ─────────────────────────────── */}
        {evaluation.coachMessages && evaluation.coachMessages.length > 0 && (
          <CoachMessageStrip messages={evaluation.coachMessages.slice(0, 2)} borderColor={cfg.border} />
        )}

        {/* ── Actions ────────────────────────────────────── */}
        <div className="border-t px-6 py-5" style={{ borderColor: cfg.border }}>
          {evaluation.permission === 'BLOCKED' && (
            <p className="mb-4 text-center text-xs italic text-text-muted">
              "Discipline protected your capital."
            </p>
          )}
          <div className="flex gap-3">
            <Button onClick={onReset} variant="ghost" size="md" className="flex-1">
              ← New Trade
            </Button>
            {cfg.confirmLabel && (
              <Button
                onClick={onConfirm}
                variant={cfg.confirmVariant}
                size="md"
                loading={submitting}
                className="flex-1"
              >
                {cfg.confirmLabel}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function VerdictMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-4 py-4 text-center">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 font-mono text-base font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

const COACH_COLORS: Record<CoachMessage['type'], { dot: string; label: string }> = {
  info:    { dot: '#4F8EF7', label: 'INTEL'   },
  warning: { dot: '#F59E0B', label: 'CAUTION' },
  alert:   { dot: '#FF3B6B', label: 'ALERT'   },
  success: { dot: '#00E5A0', label: 'INSIGHT' },
}

function CoachMessageStrip({ messages, borderColor }: { messages: CoachMessage[]; borderColor: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="border-t px-6 py-4 space-y-3"
      style={{ borderColor }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">System Mentor</p>
      {messages.map((msg, i) => {
        const c = COACH_COLORS[msg.type]
        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 + i * 0.07 }}
            className="flex items-start gap-3"
          >
            <div className="mt-1.5 h-3 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: c.dot }} />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold tracking-widest" style={{ color: c.dot }}>{c.label}</span>
              <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{msg.message}</p>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
