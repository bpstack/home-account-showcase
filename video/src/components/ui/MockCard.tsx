import React from 'react'
import { useCurrentFrame, spring, useVideoConfig } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

interface MockCardProps {
  title: string
  value: string
  color?: string
  delay?: number
}

export const MockCard: React.FC<MockCardProps> = ({
  title,
  value,
  color = COLORS.accent,
  delay = 0,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 120 },
  })

  const scale = 0.9 + 0.1 * entrance
  const opacity = entrance

  return (
    <div
      style={{
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 20,
        fontFamily: FONTS.body,
        transform: `scale(${scale})`,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 180,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 13,
            color: COLORS.textSecondary,
            fontWeight: 500,
          }}
        >
          {title}
        </span>
      </div>
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: COLORS.textPrimary,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </span>
    </div>
  )
}
