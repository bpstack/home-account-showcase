import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'
import { enter } from '../../design/motion'
import { Icon, type IconName } from './Icon'

/**
 * The scene title: a small petrol label with its icon, a headline and an optional line under it.
 * Sentence case, no spaced capitals, as the app writes its headings.
 */
export const Caption: React.FC<{
  eyebrow: string
  icon: IconName
  title: string
  description?: string
  align?: 'center' | 'left'
  /** 1 for the 1920×1080 video; the vertical one passes a bigger scale */
  size?: number
  delay?: number
  color?: string
  style?: React.CSSProperties
}> = ({ eyebrow, icon, title, description, align = 'center', size = 1, delay = 0, color = COLORS.accent, style }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const a = enter(frame, fps, delay)
  const b = enter(frame, fps, delay + 5)
  const c = enter(frame, fps, delay + 10)
  const rise = (p: number) => ({ opacity: p, transform: `translateY(${(1 - p) * 16}px)` })

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        textAlign: align,
        fontFamily: FONTS.sans,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 * size, color, fontSize: 20 * size, fontWeight: 500, ...rise(a) }}>
        <Icon name={icon} size={22 * size} />
        {eyebrow}
      </div>
      <div
        style={{
          marginTop: 12 * size,
          fontSize: 48 * size,
          lineHeight: 1.12,
          fontWeight: 500,
          letterSpacing: '-0.015em',
          color: COLORS.text,
          ...rise(b),
        }}
      >
        {title}
      </div>
      {description && (
        <div style={{ marginTop: 12 * size, fontSize: 22 * size, lineHeight: 1.4, color: COLORS.textSecondary, ...rise(c) }}>
          {description}
        </div>
      )}
    </div>
  )
}

/** The page behind every scene: the app's page colour with a faint petrol light. */
export const Backdrop: React.FC<{ glowX?: string; glowY?: string; strength?: number }> = ({
  glowX = '50%',
  glowY = '0%',
  strength = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: COLORS.bg,
      backgroundImage: [
        `radial-gradient(ellipse 60% 50% at ${glowX} ${glowY}, rgba(63, 178, 188, ${0.12 * strength}), transparent 70%)`,
        'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)',
      ].join(', '),
      backgroundSize: '100% 100%, 32px 32px',
    }}
  />
)
