'use client'

import { motion } from 'framer-motion'
import { formatTime } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface HeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export function Header({ title, subtitle, children }: HeaderProps) {
  const [time, setTime] = useState('')

  useEffect(() => {
    setTime(new Date().toISOString())
    const t = setInterval(() => setTime(new Date().toISOString()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="flex items-center justify-between border-b border-bg-border bg-bg-secondary px-8 py-4">
      <div>
        <motion.h1
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl font-bold text-text-primary"
        >
          {title}
        </motion.h1>
        {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {children}
        <div className="text-right">
          <p className="font-mono text-sm text-text-primary">{formatTime(time)}</p>
          <p className="text-xs text-text-muted">IST</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-blue/20 text-xs font-bold text-accent-blue">
          T
        </div>
      </div>
    </header>
  )
}
