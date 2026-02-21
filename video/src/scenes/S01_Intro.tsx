import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../design/theme'

export const S01_Intro: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 10, 75, 90], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const gradientSize = interpolate(frame, [0, 60], [40, 60], {
    extrapolateRight: 'clamp',
  })

  const logoScale = spring({ frame: frame - 8, fps, config: { damping: 12, stiffness: 80, mass: 0.8 } })
  const logoRotate = spring({ frame: frame - 8, fps, config: { damping: 15, stiffness: 60, mass: 1 } })

  const title = 'Home Account'
  const titleStart = 22
  const charsVisible = Math.floor(interpolate(frame - titleStart, [0, 20], [0, title.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }))
  const titleText = title.slice(0, charsVisible)
  const showCursor = frame > titleStart && frame % 30 < 20

  const subtitle = 'Control total de tu economía'
  const subStart = 48
  const subChars = Math.floor(interpolate(frame - subStart, [0, 25], [0, subtitle.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }))
  const subText = subtitle.slice(0, subChars)

  const badges = ['E2E Encrypted', 'PWA', 'Open Source']
  const badgeStart = 78

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        background: `radial-gradient(circle at 50% 50%, rgba(59,130,246,0.15) 0%, rgba(16,185,129,0.08) ${gradientSize}%, ${COLORS.bg} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONTS.heading,
      }}
    >
      <div
        style={{
          transform: `scale(${logoScale}) rotate(${(1 - logoRotate) * -10}deg)`,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            backgroundColor: '#fff',
            borderRadius: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 60px rgba(16,185,129,0.3), 0 0 120px rgba(59,130,246,0.15)',
          }}
        >
          <span
            style={{
              fontSize: 80,
              fontWeight: 'bold',
              color: '#1a7f37',
              fontFamily: "Comic Sans MS, 'Chalkboard SE', 'Arial Rounded MT Bold', sans-serif",
              lineHeight: 1,
              marginTop: 8,
            }}
          >
            €
          </span>
        </div>
      </div>

      <div style={{ height: 70, display: 'flex', alignItems: 'center' }}>
        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: COLORS.textPrimary,
            letterSpacing: '-0.02em',
            fontFamily: FONTS.heading,
          }}
        >
          {titleText}
          {showCursor && charsVisible < title.length && (
            <span style={{ color: COLORS.accent, fontWeight: 300 }}>|</span>
          )}
        </h1>
      </div>

      <div style={{ height: 40, marginTop: 16, display: 'flex', alignItems: 'center' }}>
        <p
          style={{
            fontSize: 28,
            color: COLORS.textSecondary,
            fontWeight: 400,
            fontFamily: FONTS.body,
          }}
        >
          {subText}
          {frame > subStart && subChars < subtitle.length && (
            <span style={{ color: COLORS.emerald, fontWeight: 300 }}>|</span>
          )}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 48 }}>
        {badges.map((badge, i) => {
          const badgeDelay = badgeStart + i * 6
          const badgeScale = spring({
            frame: frame - badgeDelay,
            fps,
            config: { damping: 12, stiffness: 100, mass: 0.6 },
          })
          const badgeOpacity = interpolate(frame - badgeDelay, [0, 5], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          const colors = ['#10b981', '#3b82f6', '#a855f7']
          return (
            <div
              key={badge}
              style={{
                transform: `scale(${badgeScale})`,
                opacity: badgeOpacity,
                padding: '10px 24px',
                borderRadius: 50,
                backgroundColor: `${colors[i]}15`,
                border: `1px solid ${colors[i]}40`,
                color: colors[i],
                fontSize: 16,
                fontWeight: 600,
                fontFamily: FONTS.mono,
                letterSpacing: '0.05em',
              }}
            >
              {badge}
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
