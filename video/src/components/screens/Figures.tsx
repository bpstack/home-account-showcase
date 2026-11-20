import React from 'react'
import { useCurrentFrame } from 'remotion'
import { COLORS } from '../../design/theme'
import { countUp, progress } from '../../design/motion'
import { Money } from '../kit/Primitives'

/**
 * Ingresos · Gastos · Saldo in one line, without boxes (frontend/components/ui/Figures.tsx).
 * The numbers count up from `start` over 24 frames.
 */
export const Figures: React.FC<{
  income: number
  expenses: number
  labels?: [string, string, string]
  start?: number
  compact?: boolean
}> = ({ income, expenses, labels = ['Ingresos', 'Gastos', 'Saldo'], start = 0, compact = false }) => {
  const frame = useCurrentFrame()
  const items = [
    { label: labels[0], value: income, sign: 'always' as const, bold: false },
    { label: labels[1], value: -expenses, sign: 'auto' as const, bold: false },
    { label: labels[2], value: income - expenses, sign: 'auto' as const, bold: true },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: compact ? 12 : 32, maxWidth: 768 }}>
      {items.map((item, i) => {
        const appear = progress(frame, start + i * 4, start + i * 4 + 10)
        return (
          <div key={item.label} style={{ minWidth: 0, opacity: appear, transform: `translateY(${(1 - appear) * 8}px)` }}>
            <div style={{ fontSize: compact ? 12 : 14, color: COLORS.textSecondary }}>{item.label}</div>
            <div style={{ marginTop: 4 }}>
              <Money
                value={countUp(frame, start + i * 4, start + i * 4 + 24, item.value)}
                sign={item.sign}
                size={compact ? 15 : 24}
                weight={item.bold ? 700 : 500}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
