import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../design/theme'

const BIP39_WORDS = ['ocean', 'brave', 'sunset', 'crystal', 'tiger', 'dawn']

export const S09_Encryption: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 25, 330, 360], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Lock animation: scale + close
  const lockScale = spring({ frame: frame - 20, fps, config: { damping: 12, stiffness: 60, mass: 1 } })
  const lockClose = interpolate(frame, [60, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Concentric waves
  const waveCount = 3
  const waves = Array.from({ length: waveCount }, (_, i) => {
    const waveDelay = 80 + i * 20
    const waveProgress = interpolate(frame - waveDelay, [0, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    return { scale: 1 + waveProgress * (1.5 + i * 0.8), opacity: (1 - waveProgress) * 0.4 }
  })

  // Encryption badges
  const badges = [
    { text: 'AES-256-GCM', color: COLORS.emerald },
    { text: 'Argon2id', color: COLORS.accent },
    { text: 'End-to-End', color: COLORS.purple },
  ]
  const badgeStart = 120

  // BIP39 grid
  const bip39Start = 200

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity, backgroundColor: COLORS.bg, fontFamily: FONTS.body }}>
      {/* Title */}
      <div style={{ position: 'absolute', top: 50, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ fontSize: 18, color: COLORS.emerald, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          Seguridad
        </span>
        <h2 style={{ fontSize: 44, fontWeight: 800, color: COLORS.textPrimary, marginTop: 10 }}>
          Cifrado de extremo a extremo
        </h2>
      </div>

      {/* Lock + waves container */}
      <div style={{ position: 'absolute', top: 180, left: '50%', transform: 'translateX(-50%)' }}>
        {/* Concentric waves */}
        {waves.map((w, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 120,
              height: 120,
              marginTop: -60,
              marginLeft: -60,
              borderRadius: '50%',
              border: `2px solid ${COLORS.emerald}`,
              transform: `scale(${w.scale})`,
              opacity: w.opacity,
            }}
          />
        ))}

        {/* Lock SVG */}
        <div style={{ position: 'relative', transform: `scale(${lockScale})`, width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={80} height={100} viewBox="0 0 80 100">
            {/* Shackle */}
            <path
              d={`M 20 45 L 20 ${35 - lockClose * 10} A 20 20 0 0 1 60 ${35 - lockClose * 10} L 60 45`}
              fill="none"
              stroke={COLORS.emerald}
              strokeWidth={6}
              strokeLinecap="round"
            />
            {/* Body */}
            <rect x={10} y={45} width={60} height={45} rx={8} fill={COLORS.emerald} />
            {/* Keyhole */}
            <circle cx={40} cy={62} r={6} fill={COLORS.bg} />
            <rect x={37} y={62} width={6} height={14} rx={2} fill={COLORS.bg} />
          </svg>
        </div>
      </div>

      {/* Encryption badges */}
      <div style={{ position: 'absolute', top: 420, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 20 }}>
        {badges.map((badge, i) => {
          const bScale = spring({ frame: frame - badgeStart - i * 12, fps, config: { damping: 12, stiffness: 120, mass: 0.5 } })
          return (
            <div
              key={badge.text}
              style={{
                transform: `scale(${bScale})`,
                padding: '12px 28px',
                borderRadius: 50,
                backgroundColor: `${badge.color}15`,
                border: `1px solid ${badge.color}40`,
                color: badge.color,
                fontSize: 18,
                fontWeight: 700,
                fontFamily: FONTS.mono,
                letterSpacing: '0.03em',
              }}
            >
              {badge.text}
            </div>
          )
        })}
      </div>

      {/* BIP39 recovery phrase */}
      <div style={{ position: 'absolute', top: 520, left: '50%', transform: 'translateX(-50%)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 14, color: COLORS.textMuted }}>Frase de recuperación de 24 palabras</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {BIP39_WORDS.map((word, i) => {
            const wordScale = spring({ frame: frame - bip39Start - i * 8, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } })
            return (
              <div
                key={word}
                style={{
                  transform: `scale(${wordScale})`,
                  padding: '10px 24px',
                  borderRadius: 10,
                  backgroundColor: COLORS.bgCard,
                  border: `1px solid ${COLORS.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.mono, minWidth: 20 }}>{i + 1}.</span>
                <span style={{ fontSize: 16, color: COLORS.textPrimary, fontWeight: 600, fontFamily: FONTS.mono }}>{word}</span>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <span style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' }}>+ 18 palabras más...</span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
