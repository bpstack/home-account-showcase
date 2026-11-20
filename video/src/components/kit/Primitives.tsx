import React from 'react'
import { COLORS, FONTS, alpha } from '../../design/theme'
import { formatMoney, type SignMode } from '../../design/money'
import { Icon, type IconName } from './Icon'

/** An amount, coloured as the app's <Money> does. */
export const Money: React.FC<{
  value: number
  sign?: SignMode
  /** auto: green up, red down · movement: green up, ink down · neutral: ink */
  tone?: 'auto' | 'movement' | 'neutral'
  weight?: number
  size?: number
  style?: React.CSSProperties
}> = ({ value, sign = 'auto', tone = 'auto', weight, size, style }) => {
  const color =
    tone === 'neutral' || Math.round(value * 100) === 0
      ? COLORS.text
      : value > 0
        ? COLORS.success
        : tone === 'movement'
          ? COLORS.text
          : COLORS.danger
  return (
    <span
      style={{
        color,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        fontWeight: weight,
        fontSize: size,
        ...style,
      }}
    >
      {formatMoney(value, sign)}
    </span>
  )
}

/** The app's Button: primary (accent fill), outline, ghost. 40 px tall at scale 1. */
export const Button: React.FC<{
  children: React.ReactNode
  variant?: 'primary' | 'outline' | 'ghost'
  icon?: IconName
  size?: 'sm' | 'md'
  style?: React.CSSProperties
}> = ({ children, variant = 'primary', icon, size = 'md', style }) => {
  const h = size === 'sm' ? 32 : 40
  const base: React.CSSProperties = {
    height: h,
    padding: size === 'sm' ? '0 12px' : '0 16px',
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 500,
    fontFamily: FONTS.sans,
    whiteSpace: 'nowrap',
  }
  const variants: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: COLORS.accent, color: COLORS.accentInk },
    outline: { border: `1px solid ${COLORS.line}`, color: COLORS.text, backgroundColor: COLORS.surface },
    ghost: { color: COLORS.textSecondary },
  }
  return (
    <div style={{ ...base, ...variants[variant], ...style }}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </div>
  )
}

/** The app's segmented control (Gastos / Ingresos, the simulator's profiles). */
export const Segmented: React.FC<{
  options: string[]
  active: number
  stretch?: boolean
  style?: React.CSSProperties
}> = ({ options, active, stretch = false, style }) => (
  <div
    style={{
      display: 'flex',
      padding: 2,
      borderRadius: 8,
      backgroundColor: COLORS.bg,
      fontSize: 14,
      ...style,
    }}
  >
    {options.map((option, i) => (
      <div
        key={option}
        style={{
          flex: stretch ? 1 : undefined,
          textAlign: 'center',
          padding: '4px 12px',
          borderRadius: 6,
          backgroundColor: i === active ? COLORS.muted : 'transparent',
          color: i === active ? COLORS.text : COLORS.textSecondary,
          fontWeight: i === active ? 500 : 400,
          boxShadow: i === active ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        {option}
      </div>
    ))}
  </div>
)

/** A small heading of a section: 14 px, weight 500, as the app's <h2>. */
export const SectionTitle: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({
  children,
  right,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
      minHeight: 28,
    }}
  >
    <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>{children}</span>
    {right}
  </div>
)

/** A category dot. */
export const Dot: React.FC<{ color: string; size?: number }> = ({ color, size = 10 }) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: color,
      flexShrink: 0,
      display: 'inline-block',
    }}
  />
)

/** A pill for the scene captions and feature lists. */
export const Pill: React.FC<{
  children: React.ReactNode
  icon?: IconName
  color?: string
  size?: number
  style?: React.CSSProperties
}> = ({ children, icon, color = COLORS.accent, size = 16, style }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.5,
      padding: `${size * 0.5}px ${size * 1.1}px`,
      borderRadius: 999,
      border: `1px solid ${alpha(color, 0.35)}`,
      backgroundColor: alpha(color, 0.1),
      color,
      fontSize: size,
      fontWeight: 500,
      fontFamily: FONTS.sans,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {icon && <Icon name={icon} size={size * 1.1} />}
    {children}
  </div>
)
