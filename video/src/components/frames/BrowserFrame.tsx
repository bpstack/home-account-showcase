import React from 'react'
import { AbsoluteFill } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

interface BrowserFrameProps {
  url: string
  showSidebar?: boolean
  children: React.ReactNode
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  url,
  showSidebar = false,
  children,
}) => {
  const frameStyle: React.CSSProperties = {
    backgroundColor: COLORS.bg,
    borderRadius: '0.75rem',
    border: `1px solid ${COLORS.border}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  const chromeBarStyle: React.CSSProperties = {
    backgroundColor: COLORS.bgCard,
    borderBottom: `1px solid ${COLORS.border}`,
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  }

  const dotsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexShrink: 0,
  }

  const dotBase: React.CSSProperties = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  }

  const urlBarStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: COLORS.bgMuted,
    borderRadius: '0.375rem',
    padding: '6px 14px',
    fontFamily: FONTS.body,
    fontSize: '13px',
    color: COLORS.textSecondary,
    border: `1px solid ${COLORS.borderLight}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }

  const contentAreaStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    backgroundColor: COLORS.bg,
  }

  const sidebarStyle: React.CSSProperties = {
    width: '220px',
    backgroundColor: COLORS.bgCard,
    borderRight: `1px solid ${COLORS.border}`,
    padding: '16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexShrink: 0,
  }

  const sidebarItemStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    fontFamily: FONTS.body,
    fontSize: '13px',
    color: active ? COLORS.textPrimary : COLORS.textSecondary,
    backgroundColor: active ? COLORS.bgMuted : 'transparent',
    borderRadius: '0',
    cursor: 'default',
  })

  const mainContentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  }

  return (
    <AbsoluteFill style={frameStyle}>
      {/* Chrome bar */}
      <div style={chromeBarStyle}>
        <div style={dotsContainerStyle}>
          <div style={{ ...dotBase, backgroundColor: '#ef4444' }} />
          <div style={{ ...dotBase, backgroundColor: '#eab308' }} />
          <div style={{ ...dotBase, backgroundColor: '#22c55e' }} />
        </div>
        <div style={urlBarStyle}>{url}</div>
      </div>

      {/* Content area */}
      <div style={contentAreaStyle}>
        {showSidebar && (
          <div style={sidebarStyle}>
            <div style={sidebarItemStyle(true)}>Dashboard</div>
            <div style={sidebarItemStyle(false)}>Transactions</div>
            <div style={sidebarItemStyle(false)}>Categories</div>
            <div style={sidebarItemStyle(false)}>Investments</div>
            <div style={sidebarItemStyle(false)}>Settings</div>
          </div>
        )}
        <div style={mainContentStyle}>{children}</div>
      </div>
    </AbsoluteFill>
  )
}
