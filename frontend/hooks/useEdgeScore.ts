'use client'

import { useMemo } from 'react'
import { calculateEdgeScore } from '@/lib/edgeScore'
import type { BehaviorStatus, EdgeBreakdown } from '@/types'

interface EdgeInput {
  behavior: BehaviorStatus | null
  tradesToday: number
  tradeLimit?: number
  winRate?: number
  rrAvg?: number
  blockedTaken?: number
}

/** Client-side edge score estimator — used when API / DB not available. */
export function useEdgeScore(input: EdgeInput): EdgeBreakdown {
  return useMemo(() => {
    const {
      behavior,
      tradesToday,
      tradeLimit = 2,
      rrAvg = 1.3,
      blockedTaken = 0,
    } = input

    const consecutiveLosses = behavior?.consecutiveLosses ?? 0
    const revengeTrade      = behavior?.revengeRisk ?? false
    const exceededLimit     = tradesToday > tradeLimit
    const overtrading       = tradesToday > 3
    const perfectDay        =
      tradesToday > 0 &&
      !revengeTrade &&
      consecutiveLosses === 0 &&
      blockedTaken === 0

    // Derive approximate signals from available data
    const permission = behavior?.isLocked ? 'BLOCKED' as const
      : blockedTaken > 0   ? 'BLOCKED' as const
      : rrAvg < 1          ? 'BLOCKED' as const
      : rrAvg < 1.5        ? 'RISKY' as const
      : 'ALLOWED' as const

    return calculateEdgeScore(
      permission,
      rrAvg,
      {
        lateEntry:     false,
        againstTrend:  false,
        sidewaysMarket: false,
        trapMarket:    false,
        goodEntry:     rrAvg >= 1.5 && !revengeTrade,
        hasSL:         true,
        movedSL:       false,
      },
      { consecutiveLosses, overtrading, revengeTrade, exceededLimit, perfectDay }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    input.behavior?.consecutiveLosses,
    input.behavior?.revengeRisk,
    input.behavior?.isLocked,
    input.tradesToday,
    input.tradeLimit,
    input.rrAvg,
    input.blockedTaken,
  ])
}
