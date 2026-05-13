import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase, IS_ADMIN_CONFIGURED } from '@/lib/supabaseAdmin'
import { analyzeBehavior } from '@/lib/engines/behaviorEngine'
import type { Trade } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  if (!IS_ADMIN_CONFIGURED) {
    return NextResponse.json({
      tradesToday: 0, consecutiveLosses: 0, isLocked: false,
      revengeRisk: false, warningMessages: [],
    })
  }

  // Fetch recent trades
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  // Check active lock
  const { data: lock } = await supabase
    .from('user_locks')
    .select('unlocks_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('unlocks_at', new Date().toISOString())
    .single()

  const mappedTrades: Trade[] = (trades || []).map((t) => ({
    id: t.id,
    userId: t.user_id,
    symbol: t.symbol,
    direction: t.direction,
    entryPrice: t.entry_price,
    exitPrice: t.exit_price,
    stopLoss: t.stop_loss,
    target: t.target,
    quantity: t.quantity,
    pnl: t.pnl,
    permissionStatus: t.permission_status,
    marketState: t.market_state,
    status: t.status,
    blockReasons: t.block_reasons,
    rrRatio: t.rr_ratio,
    createdAt: t.created_at,
    closedAt: t.closed_at,
  }))

  const behavior = analyzeBehavior(mappedTrades, lock?.unlocks_at)

  return NextResponse.json(behavior)
}
