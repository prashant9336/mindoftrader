'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled,   setIsInstalled]   = useState(false)
  const [isOnline,      setIsOnline]       = useState(true)
  const [showBanner,    setShowBanner]     = useState(false)

  useEffect(() => {
    // Online/offline status
    setIsOnline(navigator.onLine)
    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsInstalled(standalone)

    // Track visit count for deferred install prompt
    const visits = parseInt(localStorage.getItem('mot_visits') || '0') + 1
    localStorage.setItem('mot_visits', String(visits))

    // Capture beforeinstallprompt
    const handleInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      // Show banner after 2nd visit if not installed
      if (visits >= 2 && !standalone) setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handleInstall)

    // iOS: show manual instructions after 3 visits
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIOS && visits >= 3 && !standalone) setShowBanner(true)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleInstall)
    }
  }, [])

  const triggerInstall = async () => {
    if (!installPrompt) return false
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setInstallPrompt(null)
      setShowBanner(false)
    }
    return outcome === 'accepted'
  }

  const dismissBanner = () => {
    setShowBanner(false)
    localStorage.setItem('mot_install_dismissed', Date.now().toString())
  }

  const isIOS = typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent)

  return { installPrompt, isInstalled, isOnline, showBanner, isIOS, triggerInstall, dismissBanner }
}
