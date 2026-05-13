'use client'

import { motion } from 'framer-motion'

interface TradeLimitProps {
  count: number
  limit: number
  isAtLimit: boolean
}

export function TradeLimitBar({ count, limit, isAtLimit }: TradeLimitProps) {
  const pips = Array.from({ length: limit })

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-muted whitespace-nowrap">
        Trades today
      </span>
      <div className="flex items-center gap-1.5">
        {pips.map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="h-2 w-6 rounded-full"
            style={{
              backgroundColor: i < count
                ? isAtLimit ? '#FF3B6B' : '#4F8EF7'
                : '#1C2333',
              boxShadow: i < count && !isAtLimit
                ? '0 0 6px rgba(79,142,247,0.4)'
                : i < count && isAtLimit
                ? '0 0 6px rgba(255,59,107,0.4)'
                : 'none',
            }}
          />
        ))}
      </div>
      <span className="font-mono text-xs font-semibold" style={{ color: isAtLimit ? '#FF3B6B' : '#7D8590' }}>
        {count}/{limit}
      </span>
    </div>
  )
}

export function TradeLimitBlock() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-state-blocked/20 bg-state-blocked/6 p-6 text-center"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-state-blocked/25 bg-state-blocked/12">
        <span className="font-mono text-lg font-black text-state-blocked">✗</span>
      </div>
      <h3 className="font-mono text-lg font-black tracking-wider text-state-blocked">
        DAILY LIMIT REACHED
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        You&apos;ve taken your maximum trades for today.
        <br />
        More trades rarely mean more profit.
      </p>
      <p className="mt-4 text-xs italic text-text-muted">
        "The market will be here tomorrow. Protect today&apos;s capital."
      </p>
    </motion.div>
  )
}
