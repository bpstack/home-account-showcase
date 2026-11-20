import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS } from '../../design/theme'
import { pop, progress } from '../../design/motion'
import { FIGURES, TRANSACTIONS } from '../../data/demo'
import { Icon } from '../kit/Icon'
import { Button } from '../kit/Primitives'
import { Figures } from './Figures'
import { PeriodButton } from './OverviewScreen'
import { TxTable } from './TxTable'

const isFood = (category: string) => category.startsWith('Alimentación')

/**
 * Transacciones (frontend/app/(private)/transactions): period and "Nueva transacción", the
 * figures, the toolbar and the table. At `filterAt` the "Alimentación" filter goes on: its chip
 * pops in, the count changes and the other rows fold away.
 */
export const TransactionsScreen: React.FC<{ start?: number; filterAt?: number; compact?: boolean }> = ({
  start = 0,
  filterAt = 9999,
  compact = false,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const filtered = frame >= filterAt
  const fold = progress(frame, filterAt, filterAt + 16)
  const chip = pop(frame, fps, filterAt)
  const rows = TRANSACTIONS.slice(0, compact ? 8 : 9)
  const visibility = rows.map((tx, i) => {
    const appear = progress(frame, start + 28 + i * 4, start + 38 + i * 4)
    return isFood(tx.category) ? appear : appear * (1 - fold)
  })
  const toolbar = progress(frame, start + 18, start + 30)

  return (
    <div style={{ padding: compact ? 16 : 24, display: 'flex', flexDirection: 'column', gap: compact ? 16 : 24, maxWidth: 1152 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <PeriodButton />
        <Button icon="plus">{compact ? 'Nueva' : 'Nueva transacción'}</Button>
      </div>

      <Figures income={FIGURES.income} expenses={FIGURES.expenses} start={start + 4} compact={compact} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: toolbar }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              border: `1px solid ${COLORS.line}`,
              backgroundColor: COLORS.surface,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px',
              fontSize: 14,
              color: COLORS.textSecondary,
            }}
          >
            <Icon name="search" size={16} />
            Buscar por concepto
          </div>
          <Button variant="outline" icon="filter">
            {!compact && 'Filtros'}
            {filtered && (
              <span
                style={{
                  borderRadius: 999,
                  padding: '0 6px',
                  fontSize: 12,
                  backgroundColor: COLORS.accent,
                  color: COLORS.accentInk,
                  transform: `scale(${chip})`,
                }}
              >
                1
              </span>
            )}
          </Button>
          {!compact && <Button variant="ghost">Seleccionar</Button>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, minHeight: 30 }}>
          {filtered && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 12px',
                borderRadius: 999,
                border: `1px solid ${COLORS.line}`,
                transform: `scale(${chip})`,
              }}
            >
              Alimentación
              <Icon name="x" size={14} />
            </div>
          )}
          <span style={{ color: COLORS.textSecondary }}>{filtered ? '18 transacciones' : '62 transacciones'}</span>
        </div>
      </div>

      <TxTable rows={rows} visibility={visibility} compact={compact} actions={!compact} />
    </div>
  )
}
