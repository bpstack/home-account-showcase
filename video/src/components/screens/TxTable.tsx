import React from 'react'
import { COLORS } from '../../design/theme'
import type { Tx } from '../../data/demo'
import { Dot, Money } from '../kit/Primitives'
import { Icon } from '../kit/Icon'

const dayMonth = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'short' })

const toDate = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Transactions as the app's table (frontend/components/transactions/TxList.tsx): date once per
 * day, concept, category with its dot, the amount on the right (income green, expense in ink).
 *
 * `visibility[i]` (0–1) fades a row in and, when it drops back to 0, collapses it, so a filter
 * can take rows out smoothly.
 */
export const TxTable: React.FC<{
  rows: Tx[]
  visibility: number[]
  compact?: boolean
  actions?: boolean
  rowHeight?: number
}> = ({ rows, visibility, compact = false, actions = false, rowHeight }) => {
  const h = rowHeight ?? (compact ? 64 : 56)
  const head: React.CSSProperties = { fontSize: compact ? 12 : 14, fontWeight: 500, color: COLORS.textSecondary }
  const dateW = compact ? 64 : 128
  const amountW = compact ? 110 : 144
  const catW = 260

  // Which visible row is the first of its day: only that one shows the date
  let lastDay = ''
  const firstOfDay = rows.map((tx, i) => {
    if (visibility[i] < 0.5) return false
    const first = tx.day !== lastDay
    lastDay = tx.day
    return first
  })

  return (
    <div style={{ fontSize: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 36, borderBottom: `1px solid ${COLORS.line}` }}>
        <span style={{ ...head, width: dateW, flexShrink: 0 }}>Fecha</span>
        <span style={{ ...head, flex: 1 }}>Concepto</span>
        {!compact && <span style={{ ...head, width: catW, flexShrink: 0 }}>Categoría</span>}
        <span style={{ ...head, width: amountW, flexShrink: 0, textAlign: 'right' }}>Importe</span>
        {actions && <span style={{ width: 40 }} />}
      </div>
      {rows.map((tx, i) => {
        const v = visibility[i] ?? 0
        if (v <= 0.001) return null
        const date = toDate(tx.day)
        const category = (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.textSecondary, minWidth: 0 }}>
            <Dot color={tx.color} size={compact ? 8 : 10} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.category}</span>
          </span>
        )
        return (
          <div
            key={tx.concept + tx.day}
            style={{
              height: h * v,
              opacity: v,
              overflow: 'hidden',
              borderTop: i === 0 ? 'none' : `1px solid ${firstOfDay[i] ? COLORS.line : COLORS.surface}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 12, height: h, transform: `translateY(${(1 - v) * 10}px)` }}>
              <div style={{ width: dateW, flexShrink: 0, fontVariantNumeric: 'tabular-nums', lineHeight: 1.25 }}>
                {firstOfDay[i] && (
                  <>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ color: COLORS.text }}>{dayMonth.format(date)}</span>
                      {!compact && <span style={{ color: COLORS.textSecondary }}>{weekday.format(date)}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                      {compact && `${weekday.format(date)} `}
                      {date.getFullYear()}
                    </div>
                  </>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.concept}</div>
                {compact && <div style={{ fontSize: 12, marginTop: 4 }}>{category}</div>}
              </div>
              {!compact && <div style={{ width: catW, flexShrink: 0, paddingRight: 12 }}>{category}</div>}
              <div style={{ width: amountW, flexShrink: 0, textAlign: 'right' }}>
                <Money value={tx.amount} sign="always" tone="movement" weight={500} />
              </div>
              {actions && (
                <div style={{ width: 40, display: 'flex', justifyContent: 'flex-end', color: COLORS.textSecondary, marginTop: -2 }}>
                  <Icon name="more" size={18} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
