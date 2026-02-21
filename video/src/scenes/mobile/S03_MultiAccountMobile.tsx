import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

const ACCOUNTS = [
  { name: 'Cuenta Individual', icon: '👤', balance: '3.450,00 €', color: '#3b82f6', activeAt: 15 },
  { name: 'Cuenta Familiar', icon: '👨‍👩‍👧', balance: '8.230,50 €', color: '#10b981', activeAt: 55 },
  { name: 'Cuenta Inversión', icon: '📈', balance: '15.780,00 €', color: '#a855f7', activeAt: 95 },
]

export const S03_MultiAccountMobile: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 12, 105, 120], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const activeIndex = frame < 55 ? 0 : frame < 95 ? 1 : 2

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        backgroundColor: COLORS.bg,
        fontFamily: FONTS.body,
        display: 'flex',
        flexDirection: 'column',
        padding: 60,
        paddingTop: 120,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <span style={{ fontSize: 44, color: COLORS.accent, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
          Multi-cuenta
        </span>
        <h2 style={{ fontSize: 72, fontWeight: 800, color: COLORS.textPrimary, marginTop: 16, lineHeight: 1.05 }}>
          Un login,<br />múltiples cuentas
        </h2>
        <p style={{ fontSize: 36, color: COLORS.textSecondary, marginTop: 20 }}>
          Cambia entre perfiles al instante
        </p>
      </div>

      {/* Account cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, flex: 1, justifyContent: 'center' }}>
        {ACCOUNTS.map((acc, i) => {
          const isActive = i === activeIndex
          const cardSpring = spring({ frame: frame - 20 - i * 8, fps, config: { damping: 14, stiffness: 80, mass: 0.7 } })

          return (
            <div
              key={acc.name}
              style={{
                padding: '40px 44px',
                borderRadius: 28,
                backgroundColor: COLORS.bgCard,
                border: `2px solid ${isActive ? acc.color : COLORS.border}`,
                transform: `scale(${cardSpring * (isActive ? 1.02 : 1)})`,
                opacity: cardSpring,
                boxShadow: isActive ? `0 20px 60px ${acc.color}25` : '0 8px 30px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 32,
              }}
            >
              <div style={{ fontSize: 64 }}>{acc.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 8 }}>
                  {acc.name}
                </div>
                <div style={{ fontSize: 26, color: COLORS.textMuted }}>
                  Saldo disponible
                </div>
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, color: isActive ? acc.color : COLORS.textSecondary }}>
                {acc.balance}
              </div>
            </div>
          )
        })}
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 48 }}>
        {ACCOUNTS.map((acc, i) => (
          <div
            key={i}
            style={{
              width: i === activeIndex ? 48 : 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: i === activeIndex ? acc.color : COLORS.bgMuted,
              transition: 'width 0.3s',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  )
}
