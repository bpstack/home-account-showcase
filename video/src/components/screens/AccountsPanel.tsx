import React from 'react'
import { useCurrentFrame } from 'remotion'
import { COLORS } from '../../design/theme'
import { progress } from '../../design/motion'
import { ACCOUNTS } from '../../data/demo'
import { Icon } from '../kit/Icon'
import { Money } from '../kit/Primitives'

/**
 * The account switcher of the profile menu (frontend/components/ui/AccountSwitcher.tsx): the
 * initial in a circle, the name, a check on the active one and the role on the right.
 */
export const AccountSwitcher: React.FC<{ active: number; width?: number }> = ({ active, width = 340 }) => (
  <div
    style={{
      width,
      borderRadius: 12,
      border: `1px solid ${COLORS.line}`,
      backgroundColor: COLORS.surface,
      boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      padding: 8,
    }}
  >
    <div style={{ padding: '10px 12px 12px', borderBottom: `1px solid ${COLORS.line}`, marginBottom: 6 }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>Laura Martín</div>
      <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>Cuentas</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {ACCOUNTS.map((acc, i) => {
        const on = i === active
        return (
          <div
            key={acc.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 8,
              backgroundColor: on ? 'rgba(232, 235, 240, 0.08)' : 'transparent',
              fontSize: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: on ? COLORS.text : COLORS.muted,
                  color: on ? COLORS.bg : COLORS.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {acc.initial}
              </div>
              <span style={{ fontWeight: on ? 500 : 400 }}>{acc.name}</span>
              {on && <Icon name="check" size={12} />}
            </div>
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{acc.role}</span>
          </div>
        )
      })}
    </div>
  </div>
)

/** The figures of the active account, crossfading when it changes at `switches`. */
export const AccountFigures: React.FC<{ active: number; switches: number[]; compact?: boolean }> = ({
  active,
  switches,
  compact = false,
}) => {
  const frame = useCurrentFrame()
  const last = [...switches].reverse().find((s) => frame >= s) ?? -100
  const t = progress(frame, last, last + 12)
  const acc = ACCOUNTS[active]
  const balance = acc.income - acc.expenses
  const items = [
    { label: 'Ingresos', value: acc.income, sign: 'always' as const, bold: false },
    { label: 'Gastos', value: -acc.expenses, sign: 'auto' as const, bold: false },
    { label: 'Saldo', value: balance, sign: 'auto' as const, bold: true },
  ]
  return (
    <div style={{ opacity: t, transform: `translateY(${(1 - t) * 10}px)` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontSize: compact ? 26 : 31, fontWeight: 500 }}>{acc.name}</span>
        <span style={{ fontSize: 14, color: COLORS.textSecondary }}>Noviembre 2026</span>
      </div>
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: compact ? 16 : 32 }}>
        {items.map((item) => (
          <div key={item.label}>
            <div style={{ fontSize: 14, color: COLORS.textSecondary }}>{item.label}</div>
            <Money value={item.value} sign={item.sign} size={compact ? 20 : 25} weight={item.bold ? 700 : 500} />
          </div>
        ))}
      </div>
    </div>
  )
}
