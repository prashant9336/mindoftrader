'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader } from '@/components/ui/Card'
import type { TradeEvaluation, TradeDirection } from '@/types'

interface TradeFormProps {
  onEvaluate: (evaluation: TradeEvaluation) => void
  isLocked?: boolean
  lockedUntil?: string
}

const DIRECTIONS: { value: TradeDirection; label: string; color: string }[] = [
  { value: 'LONG',  label: '↑ LONG',  color: '#00E5A0' },
  { value: 'SHORT', label: '↓ SHORT', color: '#FF3B6B' },
  { value: 'CALL',  label: '↑ CALL',  color: '#00E5A0' },
  { value: 'PUT',   label: '↓ PUT',   color: '#FF3B6B' },
]

export function TradeForm({ onEvaluate, isLocked, lockedUntil }: TradeFormProps) {
  const [entryPrice, setEntryPrice] = useState('')
  const [stopLoss,   setStopLoss]   = useState('')
  const [target,     setTarget]     = useState('')
  const [direction,  setDirection]  = useState<TradeDirection>('LONG')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const handleEvaluate = async () => {
    setError('')
    if (!entryPrice || !stopLoss || !target) {
      setError('Fill all price fields to continue')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/trade/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryPrice: parseFloat(entryPrice),
          stopLoss:   parseFloat(stopLoss),
          target:     parseFloat(target),
          direction,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onEvaluate(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Evaluation failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Locked state ───────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="rounded-xl border border-state-blocked/25 bg-state-blocked/5 p-8 text-center"
        style={{ boxShadow: '0 0 40px rgba(255,59,107,0.1)' }}
      >
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(255,59,107,0.12)', border: '1px solid rgba(255,59,107,0.25)' }}
        >
          <span className="text-2xl">🔒</span>
        </motion.div>
        <h3 className="font-mono text-xl font-black tracking-widest text-state-blocked">TRADING LOCKED</h3>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Consecutive losses triggered an automatic cooldown.
          <br />
          Use this time to review your process — not revenge trade.
        </p>
        {lockedUntil && (
          <p className="mt-4 font-mono text-xs text-text-muted">
            Unlocks at {new Date(lockedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <p className="mt-5 text-xs italic text-text-muted">
          "The market will be here tomorrow. Your capital might not be."
        </p>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader
        title="Trade Evaluator"
        subtitle="System decides — not your gut"
      />

      {/* Direction */}
      <div className="mb-6">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-text-muted">Direction</p>
        <div className="grid grid-cols-4 gap-2">
          {DIRECTIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDirection(d.value)}
              className="rounded-xl border py-2.5 text-xs font-bold font-mono transition-all duration-200 hover:scale-[1.02]"
              style={{
                borderColor:     direction === d.value ? d.color : '#1C2333',
                backgroundColor: direction === d.value ? `${d.color}12` : 'transparent',
                color:           direction === d.value ? d.color : '#7D8590',
                boxShadow:       direction === d.value ? `0 0 12px ${d.color}20` : 'none',
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price inputs */}
      <div className="mb-5 space-y-3">
        <PriceInput label="Entry Price" value={entryPrice} onChange={setEntryPrice} placeholder="e.g. 19850" />
        <PriceInput label="Stop Loss"   value={stopLoss}   onChange={setStopLoss}   placeholder="e.g. 19800" accent="#FF3B6B" />
        <PriceInput label="Target"      value={target}     onChange={setTarget}     placeholder="e.g. 19950" accent="#00E5A0" />
      </div>

      {/* R:R live preview */}
      <AnimatePresence>
        {entryPrice && stopLoss && target && (
          <RRPreview
            entry={parseFloat(entryPrice)}
            sl={parseFloat(stopLoss)}
            tp={parseFloat(target)}
          />
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <p className="mb-4 rounded-lg border border-state-blocked/20 bg-state-blocked/8 px-3 py-2 text-xs text-state-blocked">
          {error}
        </p>
      )}

      {/* CTA — gradient button */}
      <button
        onClick={handleEvaluate}
        disabled={loading}
        className="btn-gradient mt-1 w-full rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Analyzing market conditions...
          </span>
        ) : (
          'Analyze Trade →'
        )}
      </button>
    </Card>
  )
}

function PriceInput({ label, value, onChange, placeholder, accent }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; accent?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium" style={{ color: accent || '#7D8590' }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field w-full rounded-xl border border-bg-border bg-bg-primary px-4 py-2.5 font-mono text-sm text-text-primary placeholder-text-muted"
      />
    </div>
  )
}

function RRPreview({ entry, sl, tp }: { entry: number; sl: number; tp: number }) {
  const risk   = Math.abs(entry - sl)
  const reward = Math.abs(tp - entry)
  const rr     = risk > 0 ? (reward / risk).toFixed(2) : '0'
  const rrNum  = parseFloat(rr)
  const color  = rrNum >= 1.5 ? '#00E5A0' : rrNum >= 1 ? '#F59E0B' : '#FF3B6B'

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4 overflow-hidden"
    >
      <div
        className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{ backgroundColor: `${color}08`, border: `1px solid ${color}20` }}
      >
        <span className="text-xs text-text-muted">Risk / Reward</span>
        <span className="font-mono text-sm font-bold" style={{ color }}>
          1 : {rr}
          {rrNum >= 1.5 && <span className="ml-2 text-xs opacity-60">✓ Good</span>}
          {rrNum >= 1 && rrNum < 1.5 && <span className="ml-2 text-xs opacity-60">⚠ Marginal</span>}
          {rrNum < 1 && <span className="ml-2 text-xs opacity-60">✗ Blocked</span>}
        </span>
      </div>
    </motion.div>
  )
}
