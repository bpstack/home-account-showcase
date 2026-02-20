import React from 'react'
import { useCurrentFrame, spring, useVideoConfig } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

interface FeatureCalloutProps {
  text: string
  color?: string
  delay?: number
}

export const FeatureCallout: React.FC<FeatureCalloutProps> = ({
  text,
  color = COLORS.accent,
  delay = 0,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 140 },
  })

  const scale = entrance
  const opacity = entrance

  // Parse hex color to rgba for 10% opacity background
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 9999,
        backgroundColor: hexToRgba(color, 0.1),
        fontFamily: FONTS.body,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color,
        }}
      >
        {text}
      </span>
    </div>
  )
}
