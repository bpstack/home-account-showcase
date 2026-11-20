import React from 'react'
import { COLORS, FONTS } from '../../design/theme'
import { Icon, type IconName } from './Icon'

// The app's navigation (frontend/components/layout/navigation.ts)
export const MAIN_NAV: { name: string; icon: IconName }[] = [
  { name: 'Resumen', icon: 'dashboard' },
  { name: 'Transacciones', icon: 'receipt' },
  { name: 'Categorías', icon: 'tags' },
  { name: 'Importar', icon: 'upload' },
  { name: 'Inversión', icon: 'trendingUp' },
]

export const WINDOW = { width: 1280, height: 760, chrome: 44 } as const

const NavLink: React.FC<{ name: string; icon: IconName; active: boolean }> = ({ name, icon, active }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 12px',
      borderRadius: 6,
      borderLeft: `2px solid ${active ? COLORS.accent : 'transparent'}`,
      backgroundColor: active ? COLORS.bg : 'transparent',
      color: active ? COLORS.text : COLORS.textSecondary,
      fontSize: 14,
      fontWeight: active ? 500 : 400,
    }}
  >
    <Icon name={icon} size={18} color={active ? COLORS.accent : COLORS.textSecondary} />
    {name}
  </div>
)

/** The header's right side: theme switch and the profile initial. */
export const HeaderActions: React.FC<{ initial?: string }> = ({ initial = 'L' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textSecondary }}>
      <Icon name="moon" size={18} />
    </div>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor: COLORS.muted,
        color: COLORS.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      {initial}
    </div>
  </div>
)

/**
 * A browser window holding the app shell (sidebar, header) at 1280×760, scaled to fit the video.
 * The page content goes in `children`, on the page colour with the app's 24 px margin.
 */
export const AppWindow: React.FC<{
  url: string
  active: string
  title: string
  scale: number
  children: React.ReactNode
  /** Content that covers the whole app area (the AI sheet) */
  overlay?: React.ReactNode
  padded?: boolean
  /** false: only the app, without the browser bar, border or shadow (the landing frames it) */
  chrome?: boolean
  /** Height of the whole window in virtual px */
  height?: number
}> = ({ url, active, title, scale, children, overlay, padded = true, chrome = true, height = WINDOW.height }) => (
  <div style={{ width: WINDOW.width * scale, height: height * scale, position: 'relative' }}>
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: WINDOW.width,
        height,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        borderRadius: chrome ? 12 : 0,
        overflow: 'hidden',
        border: chrome ? `1px solid ${COLORS.line}` : 'none',
        backgroundColor: COLORS.bg,
        boxShadow: chrome ? '0 40px 120px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.02)' : 'none',
        fontFamily: FONTS.sans,
        color: COLORS.text,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Browser chrome */}
      {chrome && <div
        style={{
          height: WINDOW.chrome,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 16px',
          backgroundColor: '#0d1015',
          borderBottom: `1px solid ${COLORS.line}`,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          {['#3a414d', '#3a414d', '#3a414d'].map((c, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: c }} />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            maxWidth: 520,
            margin: '0 auto',
            height: 28,
            borderRadius: 8,
            backgroundColor: COLORS.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 13,
            color: COLORS.textSecondary,
          }}
        >
          <Icon name="lock" size={12} />
          {url}
        </div>
        <div style={{ width: 52 }} />
      </div>}

      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {/* Sidebar */}
        <div
          style={{
            width: 240,
            flexShrink: 0,
            backgroundColor: COLORS.surface,
            borderRight: `1px solid ${COLORS.line}`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              height: 56,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 20px',
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            <Icon name="wallet" size={24} color={COLORS.accent} />
            <span style={{ fontSize: 16, fontWeight: 500 }}>Home Account</span>
          </div>
          <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {MAIN_NAV.map((item) => (
              <NavLink key={item.name} {...item} active={item.name === active} />
            ))}
            <div style={{ margin: '12px 0', borderTop: `1px solid ${COLORS.line}` }} />
            <NavLink name="Configuración" icon="settings" active={active === 'Configuración'} />
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div
            style={{
              height: 56,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              backgroundColor: COLORS.surface,
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 500 }}>{title}</span>
            <HeaderActions />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', padding: padded ? 24 : 0 }}>
            {children}
          </div>
        </div>

        {overlay}
      </div>
    </div>
  </div>
)
