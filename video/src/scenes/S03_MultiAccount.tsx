import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../design/theme'

const ACCOUNTS = [
  { name: 'Cuenta Individual', icon: '👤', balance: '3.450,00 €', color: '#3b82f6', activeAt: 15 },
  { name: 'Cuenta Familiar', icon: '👨‍👩‍👧', balance: '8.230,50 €', color: '#10b981', activeAt: 55 },
  { name: 'Cuenta Inversión', icon: '📈', balance: '15.780,00 €', color: '#a855f7', activeAt: 95 },
]

export const S03_MultiAccount: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 12, 105, 120], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const activeIndex = frame < 55 ? 0 : frame < 95 ? 1 : 2

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity, backgroundColor: COLORS.bg, fontFamily: FONTS.body }}>
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 18, color: COLORS.accent, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          Multi-cuenta
        </span>
        <h2 style={{ fontSize: 48, fontWeight: 800, color: COLORS.textPrimary, marginTop: 12 }}>
          Un login, múltiples cuentas
        </h2>
        <p style={{ fontSize: 20, color: COLORS.textSecondary, marginTop: 8 }}>
          Cambia entre perfiles financieros al instante
        </p>
      </div>

      <div style={{ position: 'absolute', top: 280, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 32 }}>
        {ACCOUNTS.map((acc, i) => {
          const isActive = i === activeIndex
          const cardSpring = spring({ frame: frame - 20 - i * 8, fps, config: { damping: 14, stiffness: 80, mass: 0.7 } })
          const activeScale = isActive ? 1.05 : 1
          const activeBorder = isActive ? acc.color : COLORS.border

          return (
            <div
              key={acc.name}
              style={{
                width: 300,
                padding: '32px 28px',
                borderRadius: 20,
                backgroundColor: COLORS.bgCard,
                border: `2px solid ${activeBorder}`,
                transform: `scale(${cardSpring * activeScale})`,
                opacity: cardSpring,
                boxShadow: isActive ? `0 20px 60px ${acc.color}20` : '0 10px 30px rgba(0,0,0,0.3)',
                transition: 'border-color 0.3s, box-shadow 0.3s',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>{acc.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 8 }}>
                {acc.name}
              </div>
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 20 }}>
                Saldo disponible
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: isActive ? acc.color : COLORS.textSecondary }}>
                {acc.balance}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 12 }}>
        {ACCOUNTS.map((acc, i) => (
          <div
            key={i}
            style={{
              width: i === activeIndex ? 32 : 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: i === activeIndex ? acc.color : COLORS.bgMuted,
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  )
}
