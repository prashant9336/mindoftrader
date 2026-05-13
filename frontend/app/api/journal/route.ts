import { NextRequest, NextResponse } from 'next/server'
import { sql, IS_DB_CONFIGURED, toTextArray } from '@/lib/db'
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

  if (!IS_DB_CONFIGURED) {
    return NextResponse.json({ trades: [], total: 0, page: 1, totalPages: 0 })
  }

  const { rows: trades, rowCount } = await sql`
    SELECT * FROM trades
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const { rows: countRows } = await sql`
    SELECT COUNT(*) AS total FROM trades WHERE user_id = ${userId}
  `
  const total = parseInt(countRows[0]?.total ?? '0')

  return NextResponse.json({
    trades:     trades,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { tradeId, exitPrice, userId } = body

    if (!tradeId || !exitPrice || !userId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { rows: [trade] } = await sql`
      SELECT * FROM trades WHERE id = ${tradeId} AND user_id = ${userId} LIMIT 1
    `
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    const isLong = trade.direction === 'CALL' || trade.direction === 'LONG'
    const pnl    = isLong
      ? (exitPrice - trade.entry_price) * trade.quantity
      : (trade.entry_price - exitPrice) * trade.quantity

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

    const { rows: [updated] } = await sql`
      UPDATE trades SET
        exit_price       = ${exitPrice},
        pnl              = ${pnl},
        status           = 'closed',
        closed_at        = NOW(),
        mistakes         = ${toTextArray(analysis.mistakes)},
        improvement_tips = ${toTextArray(analysis.improvementTips)}
      WHERE id = ${tradeId}
      RETURNING *
    `

    // Refresh rolling edge stats
    const { rows: scores } = await sql`
      SELECT edge_score, discipline_score, timing_score, risk_score, consistency_score
      FROM trades WHERE user_id = ${userId}
      ORDER BY created_at DESC LIMIT 10
    `
    if (scores.length > 0) {
      const mapped = scores.map((r) => ({
        total:       r.edge_score        ?? 100,
        discipline:  r.discipline_score  ?? 100,
        timing:      r.timing_score      ?? 100,
        risk:        r.risk_score        ?? 100,
        consistency: r.consistency_score ?? 100,
      }))
      const avg = computeRollingAvg(mapped)
      if (avg) {
        await sql`
          INSERT INTO user_edge_stats
            (user_id, avg_edge_score, discipline_avg, timing_avg, risk_avg, consistency_avg, trade_count, updated_at)
          VALUES
            (${userId}, ${avg.avgEdgeScore}, ${avg.disciplineAvg}, ${avg.timingAvg},
             ${avg.riskAvg}, ${avg.consistencyAvg}, ${avg.tradeCount}, NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            avg_edge_score  = EXCLUDED.avg_edge_score,
            discipline_avg  = EXCLUDED.discipline_avg,
            timing_avg      = EXCLUDED.timing_avg,
            risk_avg        = EXCLUDED.risk_avg,
            consistency_avg = EXCLUDED.consistency_avg,
            trade_count     = EXCLUDED.trade_count,
            updated_at      = NOW()
        `
      }
    }

    return NextResponse.json({ trade: updated, analysis })
  } catch (err) {
    console.error('[journal PATCH]', err)
    return NextResponse.json({ error: 'Failed to close trade' }, { status: 500 })
  }
}
