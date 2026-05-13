'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePWA } from '@/hooks/usePWA'

export function OfflineBanner() {
  const { isOnline } = usePWA()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-center gap-2 bg-state-risky/90 px-4 py-2 text-xs font-semibold text-bg-primary"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-bg-primary animate-pulse" />
          Offline — showing cached data
        </motion.div>
      )}
    </AnimatePresence>
  )
}
