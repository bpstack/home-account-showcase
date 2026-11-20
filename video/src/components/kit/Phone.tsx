import React from 'react'
import { COLORS, FONTS } from '../../design/theme'
import { Icon, type IconName } from './Icon'
import { HeaderActions } from './AppWindow'

// The mobile bottom bar (frontend/components/layout/MobileNav.tsx)
const MOBILE_NAV: { name: string; icon: IconName }[] = [
  { name: 'Resumen', icon: 'dashboard' },
  { name: 'Transacciones', icon: 'receipt' },
  { name: 'Categorías', icon: 'tags' },
  { name: 'Importar', icon: 'upload' },
  { name: 'Más', icon: 'menu' },
]

export const PHONE = { width: 390, height: 844 } as const

/**
 * A phone running the app at 390×844: status bar, the app header, the page, the bottom bar.
 * Scaled to fit the video with `scale`.
 */
export const Phone: React.FC<{
  title: string
  active: string
  scale: number
  children: React.ReactNode
  overlay?: React.ReactNode
}> = ({ title, active, scale, children, overlay }) => {
  const bezel = 12
  const outerW = PHONE.width + bezel * 2
  const outerH = PHONE.height + bezel * 2
  return (
    <div style={{ width: outerW * scale, height: outerH * scale, position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: outerW,
          height: outerH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          borderRadius: 58,
          padding: bezel,
          background: 'linear-gradient(160deg, #3a414d, #1c2129 40%, #2a313c)',
          boxShadow: '0 40px 100px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            width: PHONE.width,
            height: PHONE.height,
            borderRadius: 46,
            overflow: 'hidden',
            backgroundColor: COLORS.bg,
            fontFamily: FONTS.sans,
            color: COLORS.text,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* Status bar */}
          <div
            style={{
              height: 50,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 32px 0',
              backgroundColor: COLORS.surface,
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            <span>9:41</span>
            <div style={{ width: 110, height: 32, borderRadius: 16, backgroundColor: '#000', marginTop: -4 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 11 }}>
                {[4, 6, 8, 11].map((h) => (
                  <div key={h} style={{ width: 3, height: h, borderRadius: 1, backgroundColor: COLORS.text }} />
                ))}
              </div>
              <div style={{ width: 24, height: 12, borderRadius: 3, border: `1px solid ${COLORS.textSecondary}`, padding: 1 }}>
                <div style={{ width: '75%', height: '100%', borderRadius: 1.5, backgroundColor: COLORS.text }} />
              </div>
            </div>
          </div>

          {/* App header */}
          <div
            style={{
              height: 56,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              backgroundColor: COLORS.surface,
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 500 }}>{title}</span>
            <HeaderActions />
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>{children}</div>

          {/* Bottom bar */}
          <div
            style={{
              height: 82,
              flexShrink: 0,
              display: 'flex',
              paddingBottom: 22,
              backgroundColor: COLORS.surface,
              borderTop: `1px solid ${COLORS.line}`,
            }}
          >
            {MOBILE_NAV.map((item) => {
              const on = item.name === active
              return (
                <div
                  key={item.name}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: on ? COLORS.accent : COLORS.textSecondary,
                  }}
                >
                  <Icon name={item.icon} size={20} />
                  {item.name}
                </div>
              )
            })}
          </div>

          {/* Home indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              width: 134,
              height: 5,
              marginLeft: -67,
              borderRadius: 3,
              backgroundColor: COLORS.text,
              opacity: 0.6,
            }}
          />
          {overlay}
        </div>
      </div>
    </div>
  )
}
