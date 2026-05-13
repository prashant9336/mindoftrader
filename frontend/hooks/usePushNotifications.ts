'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export type PushState = 'unsupported' | 'loading' | 'denied' | 'subscribed' | 'unsubscribed'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = window.atob(base64)
  const arr      = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer
}

export function usePushNotifications() {
  const { data: session } = useSession()
  const [state,     setState]     = useState<PushState>('loading')
  const [publicKey, setPublicKey] = useState<string | null>(null)

  // Load VAPID public key + check existing subscription
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }

    fetch('/api/push/subscribe')
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.pushAvailable) { setState('unsupported'); return }
        setPublicKey(data.publicKey)

        const reg  = await navigator.serviceWorker.ready
        const sub  = await reg.pushManager.getSubscription()
        const perm = Notification.permission

        if (perm === 'denied') { setState('denied'); return }
        setState(sub ? 'subscribed' : 'unsubscribed')
      })
      .catch(() => setState('unsupported'))
  }, [])

  const subscribe = useCallback(async () => {
    if (!publicKey) return
    setState('loading')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState('denied'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys:     json.keys,
          userId:   session?.user?.id ?? null,
        }),
      })

      setState('subscribed')
    } catch {
      setState('unsubscribed')
    }
  }, [publicKey, session?.user?.id])

  const unsubscribe = useCallback(async () => {
    setState('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState('unsubscribed')
    } catch {
      setState('unsubscribed')
    }
  }, [])

  return { state, subscribe, unsubscribe }
}
