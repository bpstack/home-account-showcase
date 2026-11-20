import React from 'react'
import { COLORS, FONTS } from '../../design/theme'

/** The "HA" mark of the sign-in screens (frontend/components/auth/AuthShell.tsx). */
export const BrandMark: React.FC<{ size?: number; glow?: number }> = ({ size = 36, glow = 0 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.22,
      background: `linear-gradient(135deg, ${COLORS.brandFrom}, ${COLORS.brandTo})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontFamily: FONTS.sans,
      fontWeight: 700,
      fontSize: size * 0.39,
      letterSpacing: '-0.01em',
      boxShadow: glow > 0 ? `0 ${size * 0.25}px ${size * 0.9}px rgba(16, 185, 129, ${0.28 * glow})` : 'none',
      flexShrink: 0,
    }}
  >
    HA
  </div>
)
