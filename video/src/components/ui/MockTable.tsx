import React from 'react'
import { useCurrentFrame, spring, useVideoConfig } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

interface TableRow {
  date: string
  description: string
  category: string
  amount: number
}

interface MockTableProps {
  rows: TableRow[]
  delay?: number
}

const formatAmount = (amount: number): string => {
  const abs = Math.abs(amount)
  const formatted = abs
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const sign = amount < 0 ? '-' : ''
  return `${sign}${formatted} €`
}

const HEADERS = ['Date', 'Descripción', 'Categoría', 'Importe']
const COL_WIDTHS = ['15%', '35%', '25%', '25%']

export const MockTable: React.FC<MockTableProps> = ({ rows, delay = 0 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const headerOpacity = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20 },
  })

  return (
    <div
      style={{
        width: '100%',
        fontFamily: FONTS.body,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          padding: '12px 16px',
          backgroundColor: COLORS.bgMuted,
          borderBottom: `1px solid ${COLORS.border}`,
          opacity: headerOpacity,
        }}
      >
        {HEADERS.map((h, i) => (
          <span
            key={h}
            style={{
              width: COL_WIDTHS[i],
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textAlign: i === 3 ? 'right' : 'left',
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row, i) => {
        const rowDelay = delay + 8 + i * 10
        const rowSpring = spring({
          frame: frame - rowDelay,
          fps,
          config: { damping: 18 },
        })

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              padding: '10px 16px',
              backgroundColor: i % 2 === 0 ? COLORS.bgCard : COLORS.bg,
              borderBottom:
                i < rows.length - 1
                  ? `1px solid ${COLORS.borderLight}`
                  : 'none',
              opacity: rowSpring,
              transform: `translateY(${(1 - rowSpring) * 10}px)`,
            }}
          >
            <span
              style={{
                width: COL_WIDTHS[0],
                fontSize: 13,
                color: COLORS.textSecondary,
                fontFamily: FONTS.mono,
              }}
            >
              {row.date}
            </span>
            <span
              style={{
                width: COL_WIDTHS[1],
                fontSize: 13,
                color: COLORS.textPrimary,
                fontWeight: 500,
              }}
            >
              {row.description}
            </span>
            <span
              style={{
                width: COL_WIDTHS[2],
                fontSize: 13,
                color: COLORS.textSecondary,
              }}
            >
              {row.category}
            </span>
            <span
              style={{
                width: COL_WIDTHS[3],
                fontSize: 13,
                fontWeight: 600,
                fontFamily: FONTS.mono,
                color: row.amount < 0 ? COLORS.red : COLORS.green,
                textAlign: 'right',
              }}
            >
              {formatAmount(row.amount)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
