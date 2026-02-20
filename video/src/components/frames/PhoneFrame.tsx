import React from 'react'
import { AbsoluteFill } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

interface PhoneFrameProps {
  children: React.ReactNode
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  }

  const phoneOuterStyle: React.CSSProperties = {
    width: '375px',
    height: '812px',
    borderRadius: '2.5rem',
    backgroundColor: COLORS.bgCard,
    border: `3px solid ${COLORS.bgMuted}`,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
  }

  const notchContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  }

  const notchStyle: React.CSSProperties = {
    width: '126px',
    height: '34px',
    backgroundColor: '#000000',
    borderRadius: '0 0 1.25rem 1.25rem',
  }

  const statusBarStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 28px 8px 28px',
    backgroundColor: COLORS.bg,
    flexShrink: 0,
    position: 'relative',
    zIndex: 5,
  }

  const timeStyle: React.CSSProperties = {
    fontFamily: FONTS.body,
    fontSize: '15px',
    fontWeight: 600,
    color: COLORS.textPrimary,
  }

  const statusIconsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }

  const contentStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
    position: 'relative',
  }

  const homeIndicatorContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    padding: '8px 0 10px 0',
    backgroundColor: COLORS.bg,
    flexShrink: 0,
  }

  const homeIndicatorStyle: React.CSSProperties = {
    width: '134px',
    height: '5px',
    backgroundColor: COLORS.textMuted,
    borderRadius: '2.5px',
  }

  return (
    <AbsoluteFill style={containerStyle}>
      <div style={phoneOuterStyle}>
        {/* Notch */}
        <div style={notchContainerStyle}>
          <div style={notchStyle} />
        </div>

        {/* Status bar */}
        <div style={statusBarStyle}>
          <div style={timeStyle}>9:41</div>
          <div style={statusIconsStyle}>
            {/* Signal bars */}
            <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
              <rect x="0" y="9" width="3" height="3" rx="0.5" fill={COLORS.textPrimary} />
              <rect x="4.5" y="6" width="3" height="6" rx="0.5" fill={COLORS.textPrimary} />
              <rect x="9" y="3" width="3" height="9" rx="0.5" fill={COLORS.textPrimary} />
              <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill={COLORS.textPrimary} />
            </svg>
            {/* WiFi */}
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <path
                d="M8 11.5a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z"
                fill={COLORS.textPrimary}
              />
              <path
                d="M4.93 7.76a4.5 4.5 0 016.14 0"
                stroke={COLORS.textPrimary}
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M2.4 5.23a8 8 0 0111.2 0"
                stroke={COLORS.textPrimary}
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M0 2.7a11.5 11.5 0 0116 0"
                stroke={COLORS.textPrimary}
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            {/* Battery */}
            <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
              <rect
                x="0.5"
                y="0.5"
                width="22"
                height="12"
                rx="2.5"
                stroke={COLORS.textSecondary}
                strokeWidth="1"
              />
              <rect x="2" y="2" width="19" height="9" rx="1.5" fill={COLORS.green} />
              <path
                d="M24 4.5v4a2 2 0 000-4z"
                fill={COLORS.textSecondary}
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div style={contentStyle}>{children}</div>

        {/* Home indicator */}
        <div style={homeIndicatorContainerStyle}>
          <div style={homeIndicatorStyle} />
        </div>
      </div>
    </AbsoluteFill>
  )
}
