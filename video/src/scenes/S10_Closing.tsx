import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../design/theme'

const FEATURES = [
  { icon: '📊', label: 'Dashboard completo' },
  { icon: '💳', label: 'Multi-cuenta' },
  { icon: '📈', label: 'Inversiones IA' },
  { icon: '🤖', label: 'Chat inteligente' },
  { icon: '🔒', label: 'Cifrado E2E' },
  { icon: '📱', label: 'PWA responsive' },
]

export const S10_Closing: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 10, 75, 90], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 80, mass: 0.8 } })

  const featStart = 20

  const ctaSpring = spring({ frame: frame - 70, fps, config: { damping: 14, stiffness: 80, mass: 0.7 } })

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        background: `radial-gradient(circle at 50% 40%, rgba(16,185,129,0.12) 0%, rgba(59,130,246,0.06) 40%, ${COLORS.bg} 100%)`,
        fontFamily: FONTS.body,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ transform: `scale(${logoScale})`, marginBottom: 24 }}>
        <div
          style={{
            width: 80,
            height: 80,
            backgroundColor: '#fff',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 15px 40px rgba(16,185,129,0.25)',
          }}
        >
          <span style={{ fontSize: 52, fontWeight: 'bold', color: '#1a7f37', fontFamily: "Comic Sans MS, sans-serif", lineHeight: 1, marginTop: 5 }}>€</span>
        </div>
      </div>

      <h1 style={{ fontSize: 52, fontWeight: 800, color: COLORS.textPrimary, marginBottom: 8, letterSpacing: '-0.02em' }}>
        Home Account
      </h1>
      <p style={{ fontSize: 20, color: COLORS.textSecondary, marginBottom: 48 }}>
        Control total de tu economía
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
        {FEATURES.map((feat, i) => {
          const fScale = spring({ frame: frame - featStart - i * 4, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } })
          return (
            <div
              key={feat.label}
              style={{
                transform: `scale(${fScale})`,
                padding: '16px 28px',
                borderRadius: 14,
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minWidth: 200,
              }}
            >
              <span style={{ fontSize: 24 }}>{feat.icon}</span>
              <span style={{ fontSize: 15, color: COLORS.textPrimary, fontWeight: 600 }}>{feat.label}</span>
            </div>
          )
        })}
      </div>

      <div
        style={{
          transform: `scale(${ctaSpring})`,
          opacity: ctaSpring,
          padding: '16px 48px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #10b981, #3b82f6)',
          color: '#fff',
          fontSize: 22,
          fontWeight: 700,
          boxShadow: '0 15px 40px rgba(16,185,129,0.3)',
          letterSpacing: '0.02em',
        }}
      >
        Comienza gratis →
      </div>

      <div
        style={{
          marginTop: 24,
          opacity: interpolate(frame, [80, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          fontSize: 14,
          color: COLORS.textMuted,
        }}
      >
        100% gratuito · Código abierto · Privacidad total
      </div>
    </AbsoluteFill>
  )
}
