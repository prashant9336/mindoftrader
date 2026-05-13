import type { TradePermission, MarketState } from '@/types'

export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals)
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function permissionColor(status: TradePermission): string {
  return {
    ALLOWED: '#00E5A0',
    RISKY: '#F59E0B',
    BLOCKED: '#FF3B6B',
  }[status]
}

export function marketStateColor(state: MarketState): string {
  return {
    TRENDING: '#00E5A0',
    SIDEWAYS: '#F59E0B',
    TRAP: '#FF3B6B',
  }[state]
}

export function permissionBg(status: TradePermission): string {
  return {
    ALLOWED: 'bg-state-allowed/10 border-state-allowed/30',
    RISKY: 'bg-state-risky/10 border-state-risky/30',
    BLOCKED: 'bg-state-blocked/10 border-state-blocked/30',
  }[status]
}

export function marketStateBg(state: MarketState): string {
  return {
    TRENDING: 'bg-state-trending/10 border-state-trending/30',
    SIDEWAYS: 'bg-state-sideways/10 border-state-sideways/30',
    TRAP: 'bg-state-trap/10 border-state-trap/30',
  }[state]
}

export function getTimeOfDay(): 'pre-market' | 'opening' | 'midday' | 'closing' | 'after-market' {
  const hour = new Date().getHours()
  if (hour < 9) return 'pre-market'
  if (hour < 10) return 'opening'
  if (hour < 14) return 'midday'
  if (hour < 15) return 'closing'
  return 'after-market'
}
