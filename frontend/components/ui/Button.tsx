'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  className?: string
}

const VARIANTS = {
  primary: 'bg-accent-blue hover:bg-accent-blue/80 text-white border-transparent',
  secondary: 'bg-bg-border hover:bg-bg-border/80 text-text-primary border-transparent',
  danger: 'bg-state-blocked/20 hover:bg-state-blocked/30 text-state-blocked border-state-blocked/30',
  ghost: 'bg-transparent hover:bg-bg-border text-text-secondary border-bg-border',
  success: 'bg-state-allowed/20 hover:bg-state-allowed/30 text-state-allowed border-state-allowed/30',
}

const SIZES = {
  sm: 'text-xs px-3 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2 rounded-xl',
  lg: 'text-base px-6 py-3 rounded-xl font-semibold',
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  className,
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: disabled || loading ? 1 : 1.01 }}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 border font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-accent-blue/50',
        'disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </motion.button>
  )
}
