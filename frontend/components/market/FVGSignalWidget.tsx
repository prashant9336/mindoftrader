'use client'

import { motion } from 'framer-motion'
import { formatNumber } from '@/lib/utils'
import type { FVGContext, FVGTrendState } from '@/types'

interface Props {
  fvg: FVGContext
}

const TREND_META: Record<FVGTrendState, { label: string; color: string }> = {
  strong_bull: { label: 'STRONG BULL', color: '#00E5A0' },
  weak_bull:   { label: 'WEAK BULL',   color: '#4F8EF7' },
  neutral:     { label: 'NEUTRAL',     color: '#7D8590' },
  weak_bear:   { label: 'WEAK BEAR',   color: '#F59E0B' },
  strong_bear: { label: 'STRONG BEAR', color: '#FF3B6B' },
}

function VwapTick({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className="font-mono text-[10px] font-bold"
        style={{ color: active ? '#00E5A0' : '#FF3B6B' }}
      >
        {active ? '✓' : '✗'}
      </span>
      <span className="text-[10px] text-text-muted">{label}</span>
    </div>
  )
}

export function FVGSignalWidget({ fvg }: Props) {
  const { signal, trendState, inSession, above5mVwap, above15mVwap, aboveHTFVwap, fvgZoneCount } = fvg
  const trend = TREND_META[trendState]
  const hasSignal = !!signal

  return (
    <div className="border-t border-bg-border">
      {/* Header row */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-text-muted">
            ICT Structure
          </span>
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest bg-bg-primary text-text-muted">
            FVG
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <motion.span
              animate={{ opacity: inSession ? [1, 0.3, 1] : 1 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: inSession ? '#00E5A0' : '#7D8590' }}
            />
            <span className="font-mono text-[10px] text-text-muted">
              {inSession ? 'SESSION' : 'CLOSED'}
            </span>
          </div>
          <span
            className="font-mono text-[10px] font-bold"
            style={{ color: trend.color }}
          >
            {trend.label}
          </span>
        </div>
      </div>

      {/* VWAP alignment row */}
      <div className="flex items-center gap-4 px-6 pb-3">
        <span className="text-[10px] text-text-muted uppercase tracking-widest mr-1">VWAP</span>
        <VwapTick label="5m"  active={above5mVwap}  />
        <VwapTick label="15m" active={above15mVwap} />
        <VwapTick label="1H"  active={aboveHTFVwap} />
        <span className="ml-auto text-[10px] text-text-muted">
          {fvgZoneCount} zone{fvgZoneCount !== 1 ? 's' : ''} detected
        </span>
      </div>

      {/* Signal block */}
      {hasSignal ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-4 rounded-xl px-4 py-3"
          style={{
            backgroundColor: signal!.direction === 'LONG' ? 'rgba(0,229,160,0.07)' : 'rgba(255,59,107,0.07)',
            border:          signal!.direction === 'LONG' ? '1px solid rgba(0,229,160,0.2)' : '1px solid rgba(255,59,107,0.2)',
          }}
        >
          {/* Signal title */}
          <div className="mb-3 flex items-center gap-2">
            <span
              className="font-mono text-sm font-black tracking-widest"
              style={{ color: signal!.direction === 'LONG' ? '#00E5A0' : '#FF3B6B' }}
            >
              {signal!.direction === 'LONG' ? '▲ BUY' : '▼ SELL'}
            </span>
            <span className="rounded bg-bg-primary px-1.5 py-0.5 text-[9px] font-bold text-text-muted tracking-widest">
              FVG RETEST
            </span>
          </div>

          {/* Levels */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[9px] text-text-muted uppercase tracking-widest mb-0.5">Entry</p>
              <p className="font-mono text-xs font-bold text-text-primary">{formatNumber(signal!.entry, 1)}</p>
            </div>
            <div>
              <p className="text-[9px] text-text-muted uppercase tracking-widest mb-0.5">SL</p>
              <p className="font-mono text-xs font-bold text-state-blocked">{formatNumber(signal!.stopLoss, 1)}</p>
            </div>
            <div>
              <p className="text-[9px] text-text-muted uppercase tracking-widest mb-0.5">TP</p>
              <p className="font-mono text-xs font-bold text-state-allowed">{formatNumber(signal!.target, 1)}</p>
            </div>
          </div>

          {/* R:R and option target */}
          <div className="mt-2.5 flex items-center justify-between border-t border-bg-border pt-2.5">
            <span className="font-mono text-[10px] text-text-muted">
              R:R  1:{signal!.rrRatio}
            </span>
            <span className="font-mono text-[10px]" style={{ color: signal!.direction === 'LONG' ? '#00E5A0' : '#FF3B6B' }}>
              CE/PE target ≈ +{formatNumber(signal!.optionTarget, 0)} pts
            </span>
          </div>
        </motion.div>
      ) : (
        <div className="mx-4 mb-4 rounded-xl border border-bg-border px-4 py-3">
          <p className="text-xs text-text-muted italic">
            {!inSession
              ? 'Market session closed — no signals generated outside 09:20–14:45 IST'
              : `Watching ${fvgZoneCount} FVG zone${fvgZoneCount !== 1 ? 's' : ''} for retest — no confirmed entry yet`}
          </p>
        </div>
      )}
    </div>
  )
}
