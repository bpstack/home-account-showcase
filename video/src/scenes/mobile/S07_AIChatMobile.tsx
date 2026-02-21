import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

const USER_MSG = '¿Qué ETFs recomiendas para un perfil equilibrado?'
const AI_RESPONSE = `Para un perfil equilibrado:

• MSCI World ETF (60%)
• Bonos Europeos Gov (30%)
• Bitcoin ETF (10%)

Balance óptimo entre rendimiento y riesgo.`

const QUICK_QUESTIONS = [
  '¿Cómo diversificar?',
  'Análisis de cartera',
]

export const S07_AIChatMobile: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 12, 180, 195], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const userBubbleSpring = spring({ frame: frame - 15, fps, config: { damping: 14, stiffness: 80, mass: 0.7 } })

  const showTyping = frame > 45 && frame < 80
  const dot1 = Math.sin(frame * 0.3) * 0.5 + 0.5
  const dot2 = Math.sin(frame * 0.3 + 1) * 0.5 + 0.5
  const dot3 = Math.sin(frame * 0.3 + 2) * 0.5 + 0.5

  const aiStart = 80
  const charsPerFrame = 3
  const aiCharsVisible = Math.floor(Math.max(0, (frame - aiStart) * charsPerFrame))
  const aiText = AI_RESPONSE.slice(0, Math.min(aiCharsVisible, AI_RESPONSE.length))
  const aiDone = aiCharsVisible >= AI_RESPONSE.length

  const aiBubbleSpring = spring({ frame: frame - aiStart, fps, config: { damping: 16, stiffness: 70, mass: 0.8 } })

  const quickStart = 165

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        backgroundColor: COLORS.bg,
        fontFamily: FONTS.body,
        display: 'flex',
        flexDirection: 'column',
        padding: 60,
        paddingTop: 100,
      }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 44 }}>
        <span style={{ fontSize: 52, color: COLORS.accent, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
          Chat IA
        </span>
      </div>

      {/* Chat card — flex:1 to fill remaining height */}
      <div
        style={{
          flex: 1,
          backgroundColor: COLORS.bgCard,
          borderRadius: 28,
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Chat header */}
        <div style={{ padding: '28px 36px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 28 }}>🤖</span>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.textPrimary }}>Asistente de Inversión</div>
            <div style={{ fontSize: 24, color: COLORS.green, marginTop: 4 }}>● En línea</div>
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 20, overflow: 'hidden', minHeight: 0 }}>
          {/* User message */}
          <div
            style={{
              alignSelf: 'flex-end',
              maxWidth: '85%',
              opacity: userBubbleSpring,
              transform: `translateY(${(1 - userBubbleSpring) * 24}px)`,
            }}
          >
            <div
              style={{
                padding: '20px 28px',
                borderRadius: '24px 24px 6px 24px',
                backgroundColor: COLORS.accent,
                color: '#ffffff',
                fontSize: 28,
                lineHeight: 1.5,
              }}
            >
              {USER_MSG}
            </div>
          </div>

          {/* Typing indicator */}
          {showTyping && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 8, padding: '20px 28px', borderRadius: '24px 24px 24px 6px', backgroundColor: COLORS.bgMuted }}>
              {[dot1, dot2, dot3].map((d, i) => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: COLORS.textMuted, opacity: 0.4 + d * 0.6 }} />
              ))}
            </div>
          )}

          {/* AI response */}
          {frame > aiStart && (
            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '90%',
                opacity: aiBubbleSpring,
                transform: `translateY(${(1 - aiBubbleSpring) * 20}px)`,
              }}
            >
              <div
                style={{
                  padding: '24px 32px',
                  borderRadius: '24px 24px 24px 6px',
                  backgroundColor: COLORS.bgMuted,
                  color: COLORS.textPrimary,
                  fontSize: 28,
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  fontFamily: FONTS.body,
                }}
              >
                {aiText}
                {!aiDone && (
                  <span style={{ color: COLORS.accent, fontWeight: 300 }}>|</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick questions */}
        <div style={{ padding: '24px 36px', borderTop: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 24, color: COLORS.textMuted, marginBottom: 16 }}>Preguntas rápidas</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {QUICK_QUESTIONS.map((q, i) => {
              const qScale = spring({ frame: frame - quickStart - i * 5, fps, config: { damping: 12, stiffness: 120, mass: 0.5 } })
              return (
                <div
                  key={q}
                  style={{
                    transform: `scale(${qScale})`,
                    padding: '14px 28px',
                    borderRadius: 40,
                    border: `1px solid ${COLORS.border}`,
                    backgroundColor: COLORS.bg,
                    fontSize: 26,
                    color: COLORS.textSecondary,
                    fontWeight: 500,
                  }}
                >
                  {q}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
