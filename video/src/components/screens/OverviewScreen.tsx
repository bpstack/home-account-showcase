import React from 'react'
import { useCurrentFrame } from 'remotion'
import { COLORS } from '../../design/theme'
import { progress } from '../../design/motion'
import { EXPENSES_BY_CATEGORY, FIGURES, PERIOD, TRANSACTIONS } from '../../data/demo'
import { Icon, type IconName } from '../kit/Icon'
import { Dot, Money, Segmented, SectionTitle } from '../kit/Primitives'
import { Figures } from './Figures'
import { TxTable } from './TxTable'

const percent = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 })

export const PeriodButton: React.FC<{ label?: string }> = ({ label = PERIOD }) => (
  <div
    style={{
      height: 36,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 12px',
      borderRadius: 8,
      border: `1px solid ${COLORS.line}`,
      fontSize: 14,
      color: COLORS.text,
      whiteSpace: 'nowrap',
    }}
  >
    <Icon name="calendar" size={16} color={COLORS.textSecondary} />
    {label}
    <Icon name="chevronDown" size={16} color={COLORS.textSecondary} />
  </div>
)

const TABS: { label: string; icon: IconName }[] = [
  { label: 'Resumen', icon: 'dashboard' },
  { label: 'Histórico', icon: 'history' },
  { label: 'Ahorro', icon: 'piggy' },
]

/** The underline tabs of the dashboard, with the period beside them (or under, on a phone). */
const TabsBar: React.FC<{ compact: boolean }> = ({ compact }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: compact ? 'column' : 'row',
      alignItems: compact ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      gap: compact ? 4 : 0,
      padding: compact ? '0 16px 8px' : '0 24px',
      backgroundColor: COLORS.surface,
      borderBottom: `1px solid ${COLORS.line}`,
    }}
  >
    <div style={{ display: 'flex', gap: 16 }}>
      {TABS.map((tab, i) => (
        <div
          key={tab.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 4px',
            fontSize: 14,
            borderBottom: `2px solid ${i === 0 ? COLORS.accent : 'transparent'}`,
            color: i === 0 ? COLORS.text : COLORS.textSecondary,
            fontWeight: i === 0 ? 500 : 400,
          }}
        >
          {!compact && <Icon name={tab.icon} size={16} />}
          {tab.label}
        </div>
      ))}
    </div>
    <PeriodButton />
  </div>
)

const CategoryRows: React.FC<{ start: number; limit?: number }> = ({ start, limit }) => {
  const frame = useCurrentFrame()
  const rows = EXPENSES_BY_CATEGORY.slice(0, limit)
  const total = EXPENSES_BY_CATEGORY.reduce((s, r) => s + r.amount, 0)
  return (
    <div style={{ borderTop: `1px solid ${COLORS.line}`, borderBottom: `1px solid ${COLORS.line}` }}>
      {rows.map((row, i) => {
        const share = (row.amount / total) * 100
        const appear = progress(frame, start + i * 4, start + i * 4 + 10)
        const grow = progress(frame, start + 6 + i * 4, start + 30 + i * 4)
        const eased = 1 - Math.pow(1 - grow, 3)
        return (
          <div
            key={row.name}
            style={{
              padding: '12px 0',
              borderTop: i === 0 ? 'none' : `1px solid ${COLORS.line}`,
              opacity: appear,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
              <Dot color={row.color} />
              <span style={{ flex: 1, minWidth: 0 }}>{row.name}</span>
              <span style={{ width: 44, textAlign: 'right', color: COLORS.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                {percent.format(share)} %
              </span>
              <Money value={row.amount} sign="never" tone="neutral" style={{ width: 104, textAlign: 'right' }} />
              <Icon name="chevronDown" size={16} color={COLORS.textSecondary} />
            </div>
            <div style={{ marginTop: 8, marginLeft: 22, height: 6, borderRadius: 3, backgroundColor: COLORS.surface, overflow: 'hidden' }}>
              <div style={{ width: `${share * eased}%`, height: '100%', borderRadius: 3, backgroundColor: row.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Resumen (frontend/app/(private)/dashboard): the period's figures, a sentence comparing it with
 * the previous one, expenses by category and the latest transactions.
 */
export const OverviewScreen: React.FC<{ start?: number; compact?: boolean }> = ({ start = 0, compact = false }) => {
  const frame = useCurrentFrame()
  const sentence = progress(frame, start + 30, start + 42)
  const latest = TRANSACTIONS.slice(0, compact ? 3 : 5)
  const visibility = latest.map((_, i) => progress(frame, start + 50 + i * 5, start + 60 + i * 5))
  const sections = progress(frame, start + 20, start + 32)

  return (
    <div>
      <TabsBar compact={compact} />
      <div style={{ padding: compact ? 16 : 24, display: 'flex', flexDirection: 'column', gap: compact ? 24 : 32 }}>
        <div>
          <Figures income={FIGURES.income} expenses={FIGURES.expenses} start={start + 6} compact={compact} />
          <div style={{ marginTop: 12, fontSize: compact ? 13 : 14, color: COLORS.textSecondary, opacity: sentence }}>
            Has gastado 152,60 € menos que en octubre (−7 %).
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: compact ? 'minmax(0, 1fr)' : 'minmax(0, 3fr) minmax(0, 2fr)',
            gap: compact ? 24 : 32,
            opacity: sections,
          }}
        >
          <div>
            <SectionTitle right={<Segmented options={['Gastos', 'Ingresos']} active={0} />}>Por categoría</SectionTitle>
            <CategoryRows start={start + 26} limit={compact ? 4 : undefined} />
          </div>
          <div>
            <SectionTitle right={<span style={{ fontSize: 14, color: COLORS.accent }}>Ver todas</span>}>
              Últimas transacciones
            </SectionTitle>
            <TxTable rows={latest} visibility={visibility} compact />
          </div>
        </div>
      </div>
    </div>
  )
}
