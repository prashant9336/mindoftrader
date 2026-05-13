import { NextRequest, NextResponse } from 'next/server'
import { maybePushSignal } from '@/lib/webPush'
import type { FVGContext } from '@/types'

// POST — called by client when it detects a new FVG signal
// Deduplication happens inside maybePushSignal (DB-backed signal hash)
export async function POST(req: NextRequest) {
  try {
    const { fvg } = await req.json() as { fvg: FVGContext | null }
    await maybePushSignal(fvg)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/notify]', err)
    return NextResponse.json({ error: 'Push failed' }, { status: 500 })
  }
}
