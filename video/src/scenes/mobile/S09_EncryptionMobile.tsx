import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

const BIP39_WORDS = ['ocean', 'brave', 'sunset', 'crystal', 'tiger', 'dawn']

export const S09_EncryptionMobile: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 12, 135, 150], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const lockScale = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 60, mass: 1 } })
  const lockClose = interpolate(frame, [30, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const waveCount = 3
  const waves = Array.from({ length: waveCount }, (_, i) => {
    const waveDelay = 40 + i * 10
    const waveProgress = interpolate(frame - waveDelay, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    return { scale: 1 + waveProgress * (1.5 + i * 0.8), opacity: (1 - waveProgress) * 0.4 }
  })

  const badges = [
    { text: 'AES-256-GCM', color: COLORS.emerald },
    { text: 'Argon2id', color: COLORS.accent },
    { text: 'End-to-End', color: COLORS.purple },
  ]
  const badgeStart = 60
  const bip39Start = 100

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        backgroundColor: COLORS.bg,
        fontFamily: FONTS.body,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 60,
        paddingTop: 100,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <span style={{ fontSize: 44, color: COLORS.emerald, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
          Seguridad
        </span>
        <h2 style={{ fontSize: 72, fontWeight: 800, color: COLORS.textPrimary, marginTop: 16, lineHeight: 1.05 }}>
          Cifrado de extremo<br />a extremo
        </h2>
      </div>

      {/* Lock + waves */}
      <div style={{ position: 'relative', width: 200, height: 200, marginBottom: 56, flexShrink: 0 }}>
        {waves.map((w, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 160,
              height: 160,
              marginTop: -80,
              marginLeft: -80,
              borderRadius: '50%',
              border: `3px solid ${COLORS.emerald}`,
              transform: `scale(${w.scale})`,
              opacity: w.opacity,
            }}
          />
        ))}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) scale(${lockScale})` }}>
          <svg width={100} height={130} viewBox="0 0 80 100">
            <path
              d={`M 20 45 L 20 ${35 - lockClose * 10} A 20 20 0 0 1 60 ${35 - lockClose * 10} L 60 45`}
              fill="none"
              stroke={COLORS.emerald}
              strokeWidth={6}
              strokeLinecap="round"
            />
            <rect x={10} y={45} width={60} height={45} rx={8} fill={COLORS.emerald} />
            <circle cx={40} cy={62} r={6} fill={COLORS.bg} />
            <rect x={37} y={62} width={6} height={14} rx={2} fill={COLORS.bg} />
          </svg>
        </div>
      </div>

      {/* Security badges */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 56, flexWrap: 'wrap' }}>
        {badges.map((badge, i) => {
          const bScale = spring({ frame: frame - badgeStart - i * 6, fps, config: { damping: 12, stiffness: 120, mass: 0.5 } })
          return (
            <div
              key={badge.text}
              style={{
                transform: `scale(${bScale})`,
                padding: '16px 32px',
                borderRadius: 60,
                backgroundColor: `${badge.color}15`,
                border: `2px solid ${badge.color}40`,
                color: badge.color,
                fontSize: 30,
                fontWeight: 700,
                fontFamily: FONTS.mono,
              }}
            >
              {badge.text}
            </div>
          )
        })}
      </div>

      {/* BIP39 words */}
      <div style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 26, color: COLORS.textMuted }}>Frase de recuperación de 24 palabras</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {BIP39_WORDS.map((word, i) => {
            const wordScale = spring({ frame: frame - bip39Start - i * 4, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } })
            return (
              <div
                key={word}
                style={{
                  transform: `scale(${wordScale})`,
                  padding: '18px 28px',
                  borderRadius: 14,
                  backgroundColor: COLORS.bgCard,
                  border: `1px solid ${COLORS.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <span style={{ fontSize: 24, color: COLORS.textMuted, fontFamily: FONTS.mono, minWidth: 28 }}>{i + 1}.</span>
                <span style={{ fontSize: 32, color: COLORS.textPrimary, fontWeight: 700, fontFamily: FONTS.mono }}>{word}</span>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <span style={{ fontSize: 24, color: COLORS.textMuted, fontStyle: 'italic' }}>+ 18 palabras más...</span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
