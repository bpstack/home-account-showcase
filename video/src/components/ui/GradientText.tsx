import React from 'react'
import { COLORS, FONTS } from '../../design/theme'

interface GradientTextProps {
  text: string
  from?: string
  to?: string
  fontSize?: number
}

export const GradientText: React.FC<GradientTextProps> = ({
  text,
  from = COLORS.green,
  to = COLORS.accent,
  fontSize = 48,
}) => {
  return (
    <span
      style={{
        fontSize,
        fontWeight: 800,
        fontFamily: FONTS.heading,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        lineHeight: 1.2,
      }}
    >
      {text}
    </span>
  )
}
