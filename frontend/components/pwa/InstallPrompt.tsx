'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePWA } from '@/hooks/usePWA'

export function InstallPrompt() {
  const { showBanner, isIOS, isInstalled, triggerInstall, dismissBanner } = usePWA()

  if (isInstalled || !showBanner) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="fixed bottom-20 left-4 right-4 z-50 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm"
      >
        <div
          className="rounded-2xl border border-bg-border p-5"
          style={{
            background: 'rgba(17,21,32,0.96)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/15 border border-accent-blue/20">
              <span className="text-base font-black text-accent-blue">M</span>
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Install MindOfTrader</p>
              <p className="text-xs text-text-muted">Get faster, app-like access</p>
            </div>
            <button
              onClick={dismissBanner}
              className="ml-auto text-text-muted hover:text-text-secondary transition-colors p-1"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Perks */}
          <div className="mb-4 space-y-1.5">
            {['Instant launch — no browser UI', 'Works offline — last state cached', 'Feels like a native app'].map((p) => (
              <div key={p} className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="text-state-allowed">✓</span>
                {p}
              </div>
            ))}
          </div>

          {isIOS ? (
            // iOS manual instructions
            <div className="rounded-xl border border-bg-border bg-bg-primary/60 p-3">
              <p className="text-xs font-semibold text-text-primary mb-1.5">Install on iOS:</p>
              <p className="text-xs text-text-secondary leading-relaxed">
                Tap the <span className="text-accent-blue font-mono">Share</span> button in Safari,
                then <span className="text-accent-blue font-mono">Add to Home Screen</span>.
              </p>
            </div>
          ) : (
            <button
              onClick={triggerInstall}
              className="btn-gradient w-full rounded-xl py-2.5 text-sm font-semibold text-white"
            >
              Install App
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
