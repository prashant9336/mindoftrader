import { NextRequest, NextResponse } from 'next/server'
import { sql, IS_DB_CONFIGURED } from '@/lib/db'
import { IS_PUSH_CONFIGURED, VAPID_PUBLIC } from '@/lib/webPush'

// GET — return VAPID public key so client can subscribe
export async function GET() {
  return NextResponse.json({
    publicKey:     VAPID_PUBLIC,
    pushAvailable: IS_PUSH_CONFIGURED && IS_DB_CONFIGURED,
  })
}

// POST — save a new push subscription
export async function POST(req: NextRequest) {
  if (!IS_PUSH_CONFIGURED || !IS_DB_CONFIGURED) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 })
  }

  const body = await req.json()
  const { endpoint, keys, userId } = body

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${userId ?? null}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
    ON CONFLICT (endpoint) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          p256dh  = EXCLUDED.p256dh,
          auth    = EXCLUDED.auth
  `

  return NextResponse.json({ ok: true })
}

// DELETE — remove a push subscription
export async function DELETE(req: NextRequest) {
  if (!IS_DB_CONFIGURED) return NextResponse.json({ ok: true })

  const { endpoint } = await req.json()
  if (endpoint) {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`
  }

  return NextResponse.json({ ok: true })
}
