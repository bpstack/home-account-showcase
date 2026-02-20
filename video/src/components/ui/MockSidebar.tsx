import React from 'react'
import { useCurrentFrame, spring, useVideoConfig } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

const NAV_ITEMS = [
  { label: 'Dashboard', color: COLORS.accent },
  { label: 'Transacciones', color: COLORS.emerald },
  { label: 'Categorías', color: COLORS.purple },
  { label: 'Presupuesto', color: COLORS.amber },
  { label: 'Inversión', color: COLORS.cyan },
]

export const MockSidebar: React.FC<{ activeItem?: string }> = ({
  activeItem = 'Dashboard',
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const slideIn = spring({ frame, fps, config: { damping: 20 } })

  return (
    <div
      style={{
        width: 200,
        height: '100%',
        backgroundColor: COLORS.bgCard,
        borderRight: `1px solid ${COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 24,
        fontFamily: FONTS.body,
        transform: `translateX(${(1 - slideIn) * -200}px)`,
        opacity: slideIn,
      }}
    >
      {NAV_ITEMS.map((item, i) => {
        const isActive = item.label === activeItem
        const itemSpring = spring({
          frame: frame - i * 5,
          fps,
          config: { damping: 18 },
        })

        return (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderLeft: isActive
                ? `3px solid ${COLORS.accent}`
                : '3px solid transparent',
              backgroundColor: isActive ? COLORS.bgMuted : 'transparent',
              opacity: itemSpring,
              transform: `translateX(${(1 - itemSpring) * -20}px)`,
              cursor: 'default',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: item.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 14,
                color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
