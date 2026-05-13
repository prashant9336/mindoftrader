'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  className?: string
  glow?: 'green' | 'red' | 'yellow' | 'blue' | 'none'
  hover?: boolean
}

const GLOW_CLASSES = {
  green: 'hover:shadow-[0_0_30px_rgba(0,229,160,0.15)]',
  red: 'hover:shadow-[0_0_30px_rgba(255,59,107,0.15)]',
  yellow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]',
  blue: 'hover:shadow-[0_0_30px_rgba(79,142,247,0.15)]',
  none: '',
}

export function Card({ children, className, glow = 'none', hover = true, ...props }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-xl border border-bg-border bg-bg-card p-6 transition-all duration-300',
        hover && 'card-interactive hover:border-text-muted/30',
        glow !== 'none' && GLOW_CLASSES[glow],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}

export function CardHeader({ title, subtitle, action, icon }: CardHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-border text-text-secondary">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-text-secondary">
            {title}
          </h3>
          {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: string
}

export function StatCard({ label, value, subtext, trend, color }: StatCardProps) {
  return (
    <Card hover glow="none" className="p-4">
      <p className="text-xs font-medium uppercase tracking-widest text-text-muted">{label}</p>
      <p
        className="mt-2 text-2xl font-bold font-mono"
        style={{ color: color || '#E6EDF3' }}
      >
        {value}
      </p>
      {subtext && (
        <p className={cn(
          'mt-1 text-xs',
          trend === 'up' && 'text-state-allowed',
          trend === 'down' && 'text-state-blocked',
          trend === 'neutral' && 'text-text-muted',
          !trend && 'text-text-secondary',
        )}>
          {subtext}
        </p>
      )}
    </Card>
  )
}
