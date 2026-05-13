import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase, IS_ADMIN_CONFIGURED } from '@/lib/supabaseAdmin'
import { analyzePostTrade } from '@/lib/engines/postTrade'
import { computeRollingAvg } from '@/lib/edgeScore'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const page   = parseInt(searchParams.get('page') || '1')
  const limit  = 20
  const offset = (page - 1) * limit

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  if (!IS_ADMIN_CONFIGURED) {
    return NextResponse.json({ trades: [], total: 0, page: 1, totalPages: 0 })
  }

  const { data: trades, count } = await supabase
    .from('trades')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return NextResponse.json({
    trades:      trades || [],
    total:       count || 0,
    page,
    totalPages:  Math.ceil((count || 0) / limit),
  })
}

// Close a trade, run post-trade analysis, update edge stats
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { tradeId, exitPrice, userId } = body

    if (!tradeId || !exitPrice || !userId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Get the trade
    const { data: trade, error: fetchError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    const isLong = trade.direction === 'CALL' || trade.direction === 'LONG'
    const pnl    = isLong
      ? (exitPrice - trade.entry_price) * trade.quantity
      : (trade.entry_price - exitPrice) * trade.quantity

    // Run post-trade analysis
    const analysis = analyzePostTrade({
      trade: {
        id: trade.id, userId: trade.user_id, symbol: trade.symbol,
        direction: trade.direction, entryPrice: trade.entry_price,
        stopLoss: trade.stop_loss, target: trade.target,
        quantity: trade.quantity, pnl,
        permissionStatus: trade.permission_status,
        marketState: trade.market_state, status: 'closed',
        rrRatio: trade.rr_ratio, createdAt: trade.created_at,
      },
      marketStateAtEntry: trade.market_state,
      atrAtEntry:  85,
      vwapAtEntry: trade.entry_price,
    })

    const { data: updated, error: updateError } = await supabase
      .from('trades')
      .update({
        exit_price:       exitPrice,
        pnl,
        status:           'closed',
        closed_at:        new Date().toISOString(),
        mistakes:         analysis.mistakes,
        improvement_tips: analysis.improvementTips,
      })
      .eq('id', tradeId)
      .select()
      .single()

    if (updateError) throw updateError

    // Refresh rolling edge stats after trade closes
    const { data: scores } = await supabase
      .from('trades')
      .select('edge_score, discipline_score, timing_score, risk_score, consistency_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (scores && scores.length > 0) {
      const mapped = scores.map((r) => ({
        total:       r.edge_score        ?? 100,
        discipline:  r.discipline_score  ?? 100,
        timing:      r.timing_score      ?? 100,
        risk:        r.risk_score        ?? 100,
        consistency: r.consistency_score ?? 100,
      }))
      const avg = computeRollingAvg(mapped)
      if (avg) {
        await supabase.from('user_edge_stats').upsert({
          user_id:         userId,
          avg_edge_score:  avg.avgEdgeScore,
          discipline_avg:  avg.disciplineAvg,
          timing_avg:      avg.timingAvg,
          risk_avg:        avg.riskAvg,
          consistency_avg: avg.consistencyAvg,
          trade_count:     avg.tradeCount,
          updated_at:      new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({ trade: updated, analysis })
  } catch (err) {
    console.error('[journal PATCH]', err)
    return NextResponse.json({ error: 'Failed to close trade' }, { status: 500 })
  }
}
