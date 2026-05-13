import { NextRequest, NextResponse } from 'next/server'
import { sql, IS_DB_CONFIGURED } from '@/lib/db'
import { analyzeBehavior } from '@/lib/engines/behaviorEngine'
import type { Trade } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  if (!IS_DB_CONFIGURED) {
    return NextResponse.json({
      tradesToday: 0, consecutiveLosses: 0, isLocked: false,
      revengeRisk: false, warningMessages: [],
    })
  }

  const { rows: trades } = await sql`
    SELECT * FROM trades
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 20
  `

  const { rows: locks } = await sql`
    SELECT unlocks_at FROM user_locks
    WHERE user_id = ${userId}
      AND is_active = true
      AND unlocks_at > NOW()
    LIMIT 1
  `

  const mappedTrades: Trade[] = trades.map((t) => ({
    id: t.id, userId: t.user_id, symbol: t.symbol, direction: t.direction,
    entryPrice: t.entry_price, exitPrice: t.exit_price, stopLoss: t.stop_loss,
    target: t.target, quantity: t.quantity, pnl: t.pnl,
    permissionStatus: t.permission_status, marketState: t.market_state,
    status: t.status, blockReasons: t.block_reasons, rrRatio: t.rr_ratio,
    createdAt: t.created_at, closedAt: t.closed_at,
  }))

  const behavior = analyzeBehavior(mappedTrades, locks[0]?.unlocks_at)
  return NextResponse.json(behavior)
}
