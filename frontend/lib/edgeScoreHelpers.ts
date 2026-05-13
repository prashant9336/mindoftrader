import type { EdgeLevel } from '@/types'

const LEVELS: { min: number; level: EdgeLevel }[] = [
  { min: 80, level: 'ELITE' },
  { min: 60, level: 'SKILLED' },
  { min: 40, level: 'DEVELOPING' },
  { min: 0,  level: 'BEGINNER' },
]

export function getLevel(score: number): EdgeLevel {
  return LEVELS.find((l) => score >= l.min)!.level
}

export const LEVEL_CONFIG: Record<EdgeLevel, { color: string; bg: string; label: string }> = {
  ELITE:      { color: '#00E5A0', bg: 'rgba(0,229,160,0.12)',  label: 'Elite Trader' },
  SKILLED:    { color: '#4F8EF7', bg: 'rgba(79,142,247,0.12)', label: 'Skilled Trader' },
  DEVELOPING: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Developing' },
  BEGINNER:   { color: '#FF3B6B', bg: 'rgba(255,59,107,0.12)', label: 'Beginner' },
}
