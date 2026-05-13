import webpush from 'web-push'
import { sql, IS_DB_CONFIGURED } from '@/lib/db'
import type { FVGContext } from '@/types'

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_EMAIL   = process.env.VAPID_EMAIL       ?? 'mailto:admin@mindoftrader.com'

const IS_PUSH_CONFIGURED = !!(VAPID_PUBLIC && VAPID_PRIVATE)

if (IS_PUSH_CONFIGURED) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)
}

export { IS_PUSH_CONFIGURED, VAPID_PUBLIC }

// ── Signal fingerprint ─────────────────────────────────────────

export function signalHash(fvg: FVGContext | null): string {
  if (!fvg?.signal) return 'none'
  const { direction, entry, fvgBot, fvgTop } = fvg.signal
  return `${direction}_${Math.round(entry)}_${Math.round(fvgBot)}_${Math.round(fvgTop)}`
}

// ── Push payload builder ───────────────────────────────────────

export function buildPushPayload(fvg: FVGContext) {
  const { signal, trendState } = fvg
  if (!signal) return null

  const dir     = signal.direction === 'LONG' ? '🟢 BUY' : '🔴 SELL'
  const trend   = trendState.replace('_', ' ').toUpperCase()
  const entry   = signal.entry.toFixed(1)
  const sl      = signal.stopLoss.toFixed(1)
  const tp      = signal.target.toFixed(1)
  const opt     = signal.optionTarget.toFixed(0)
  const rr      = signal.rrRatio

  return {
    title: `${dir} Signal — NIFTY`,
    body:  `Entry ${entry}  SL ${sl}  TP ${tp} | R:R 1:${rr} | CE/PE ≈+${opt}pts | ${trend}`,
    tag:   'fvg-signal',
    url:   '/trade',
  }
}

// ── Send to all subscribers ────────────────────────────────────

export async function pushToAllSubscribers(fvg: FVGContext): Promise<number> {
  if (!IS_PUSH_CONFIGURED || !IS_DB_CONFIGURED || !fvg.signal) return 0

  const payload = buildPushPayload(fvg)
  if (!payload) return 0

  const { rows } = await sql`SELECT endpoint, p256dh, auth FROM push_subscriptions`
  if (rows.length === 0) return 0

  const results = await Promise.allSettled(
    rows.map((row) =>
      webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify(payload)
      )
    )
  )

  // Remove expired/invalid subscriptions (410 Gone)
  const expired = rows.filter((_, i) => {
    const r = results[i]
    return r.status === 'rejected' && (r.reason as { statusCode?: number })?.statusCode === 410
  })
  if (expired.length > 0) {
    await Promise.all(
      expired.map((row) => sql`DELETE FROM push_subscriptions WHERE endpoint = ${row.endpoint}`)
    )
  }

  return results.filter((r) => r.status === 'fulfilled').length
}

// ── Deduplicated push — only fires when signal hash changes ────

export async function maybePushSignal(fvg: FVGContext | null): Promise<void> {
  if (!IS_PUSH_CONFIGURED || !IS_DB_CONFIGURED) return

  const hash = signalHash(fvg)

  // Read last pushed hash from DB
  const { rows } = await sql`
    SELECT signal_hash FROM push_signal_state WHERE id = 'nifty'
  `
  const lastHash = rows[0]?.signal_hash ?? 'none'

  // Only push if signal is new and active
  if (hash === lastHash || hash === 'none') return

  // Update state first to prevent race
  await sql`
    UPDATE push_signal_state
    SET signal_hash = ${hash}, updated_at = NOW()
    WHERE id = 'nifty'
  `

  if (fvg) {
    await pushToAllSubscribers(fvg)
  }
}
