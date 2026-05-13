'use client'

import { motion } from 'framer-motion'
import type { MarketState, TradePermission } from '@/types'
import { cn } from '@/lib/utils'

interface BadgeProps {
  label: string
  variant?: 'allowed' | 'risky' | 'blocked' | 'trending' | 'sideways' | 'trap' | 'info'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}

const VARIANTS = {
  allowed: 'bg-state-allowed/15 text-state-allowed border-state-allowed/40',
  risky: 'bg-state-risky/15 text-state-risky border-state-risky/40',
  blocked: 'bg-state-blocked/15 text-state-blocked border-state-blocked/40',
  trending: 'bg-state-trending/15 text-state-trending border-state-trending/40',
  sideways: 'bg-state-sideways/15 text-state-sideways border-state-sideways/40',
  trap: 'bg-state-trap/15 text-state-trap border-state-trap/40',
  info: 'bg-accent-blue/15 text-accent-blue border-accent-blue/40',
}

const SIZES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5 font-semibold tracking-wide',
}

const DOT_COLORS = {
  allowed: 'bg-state-allowed',
  risky: 'bg-state-risky',
  blocked: 'bg-state-blocked',
  trending: 'bg-state-trending',
  sideways: 'bg-state-sideways',
  trap: 'bg-state-trap',
  info: 'bg-accent-blue',
}

export function Badge({ label, variant = 'info', size = 'md', pulse = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-wider',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT_COLORS[variant], pulse && 'animate-pulse')} />
      {label}
    </span>
  )
}

interface PermissionBadgeProps {
  status: TradePermission
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}

export function PermissionBadge({ status, size = 'md', pulse = false }: PermissionBadgeProps) {
  const variant = status.toLowerCase() as 'allowed' | 'risky' | 'blocked'
  const icons = { ALLOWED: '✓', RISKY: '⚠', BLOCKED: '✗' }
  return (
    <Badge
      label={`${icons[status]} ${status}`}
      variant={variant}
      size={size}
      pulse={pulse}
    />
  )
}

interface MarketStateBadgeProps {
  state: MarketState
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}

export function MarketStateBadge({ state, size = 'md', pulse = false }: MarketStateBadgeProps) {
  const variant = state.toLowerCase() as 'trending' | 'sideways' | 'trap'
  const icons = { TRENDING: '↑', SIDEWAYS: '→', TRAP: '⚡' }
  return (
    <Badge label={`${icons[state]} ${state}`} variant={variant} size={size} pulse={pulse} />
  )
}

// Large display badge for the dashboard hero
interface HeroBadgeProps {
  status: TradePermission | MarketState
  type: 'permission' | 'market'
}

const HERO_COLORS: Record<string, { color: string; shadow: string; bg: string }> = {
  ALLOWED: { color: '#00E5A0', shadow: '0 0 40px rgba(0, 229, 160, 0.3)', bg: 'rgba(0, 229, 160, 0.08)' },
  RISKY: { color: '#F59E0B', shadow: '0 0 40px rgba(245, 158, 11, 0.3)', bg: 'rgba(245, 158, 11, 0.08)' },
  BLOCKED: { color: '#FF3B6B', shadow: '0 0 40px rgba(255, 59, 107, 0.3)', bg: 'rgba(255, 59, 107, 0.08)' },
  TRENDING: { color: '#00E5A0', shadow: '0 0 40px rgba(0, 229, 160, 0.3)', bg: 'rgba(0, 229, 160, 0.08)' },
  SIDEWAYS: { color: '#F59E0B', shadow: '0 0 40px rgba(245, 158, 11, 0.3)', bg: 'rgba(245, 158, 11, 0.08)' },
  TRAP: { color: '#FF3B6B', shadow: '0 0 40px rgba(255, 59, 107, 0.3)', bg: 'rgba(255, 59, 107, 0.08)' },
}

export function HeroBadge({ status, type: _type }: HeroBadgeProps) {
  const config = HERO_COLORS[status] || HERO_COLORS.SIDEWAYS
  const icons: Record<string, string> = {
    ALLOWED: '✓', RISKY: '⚠', BLOCKED: '✗',
    TRENDING: '↑ TRENDING', SIDEWAYS: '→ SIDEWAYS', TRAP: '⚡ TRAP',
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, type: 'spring' }}
      style={{
        color: config.color,
        boxShadow: config.shadow,
        backgroundColor: config.bg,
        borderColor: `${config.color}40`,
      }}
      className="inline-flex items-center gap-3 rounded-2xl border px-8 py-4 text-2xl font-bold tracking-widest font-mono uppercase"
    >
      <motion.span
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {icons[status] || status}
    </motion.div>
  )
}
