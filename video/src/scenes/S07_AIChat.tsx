import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../design/theme'

const USER_MSG = '¿Qué ETFs recomiendas para un perfil equilibrado?'
const AI_RESPONSE = `Para un perfil equilibrado, te recomiendo:

• MSCI World ETF (60%) — Diversificación global
• Bonos Europeos Gov (30%) — Estabilidad
• Bitcoin ETF (10%) — Crecimiento potencial

Esta distribución ofrece un balance óptimo entre rendimiento y riesgo.`

const QUICK_QUESTIONS = [
  '¿Cómo diversificar?',
  'Análisis de cartera',
  'Perfil de riesgo',
]

export const S07_AIChat: React.FC = () => {
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
  const charsPerFrame = 3.5
  const aiCharsVisible = Math.floor(Math.max(0, (frame - aiStart) * charsPerFrame))
  const aiText = AI_RESPONSE.slice(0, Math.min(aiCharsVisible, AI_RESPONSE.length))
  const aiDone = aiCharsVisible >= AI_RESPONSE.length

  const aiBubbleSpring = spring({ frame: frame - aiStart, fps, config: { damping: 16, stiffness: 70, mass: 0.8 } })

  const quickStart = 185

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity, backgroundColor: COLORS.bg, fontFamily: FONTS.body }}>
      <div style={{ position: 'absolute', top: 40, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ fontSize: 18, color: COLORS.accent, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          Chat IA
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 90,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 800,
          height: 820,
          backgroundColor: COLORS.bgCard,
          borderRadius: 20,
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 18 }}>🤖</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary }}>Asistente de Inversión</div>
            <div style={{ fontSize: 12, color: COLORS.green }}>● En línea</div>
          </div>
        </div>

        <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
          <div
            style={{
              alignSelf: 'flex-end',
              maxWidth: '70%',
              opacity: userBubbleSpring,
              transform: `translateY(${(1 - userBubbleSpring) * 20}px)`,
            }}
          >
            <div
              style={{
                padding: '14px 20px',
                borderRadius: '18px 18px 4px 18px',
                backgroundColor: COLORS.accent,
                color: '#ffffff',
                fontSize: 15,
                lineHeight: 1.5,
              }}
            >
              {USER_MSG}
            </div>
          </div>

          {showTyping && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 4, padding: '14px 20px', borderRadius: '18px 18px 18px 4px', backgroundColor: COLORS.bgMuted }}>
              {[dot1, dot2, dot3].map((d, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS.textMuted, opacity: 0.4 + d * 0.6 }} />
              ))}
            </div>
          )}

          {frame > aiStart && (
            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '80%',
                opacity: aiBubbleSpring,
                transform: `translateY(${(1 - aiBubbleSpring) * 15}px)`,
              }}
            >
              <div
                style={{
                  padding: '16px 22px',
                  borderRadius: '18px 18px 18px 4px',
                  backgroundColor: COLORS.bgMuted,
                  color: COLORS.textPrimary,
                  fontSize: 14,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  fontFamily: FONTS.body,
                }}
              >
                {aiText}
                {!aiDone && (
                  <span style={{ color: COLORS.accent, fontWeight: 300, animation: 'blink 1s infinite' }}>|</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10 }}>Preguntas rápidas</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_QUESTIONS.map((q, i) => {
              const qScale = spring({ frame: frame - quickStart - i * 4, fps, config: { damping: 12, stiffness: 120, mass: 0.5 } })
              return (
                <div
                  key={q}
                  style={{
                    transform: `scale(${qScale})`,
                    padding: '8px 16px',
                    borderRadius: 20,
                    border: `1px solid ${COLORS.border}`,
                    backgroundColor: COLORS.bg,
                    fontSize: 13,
                    color: COLORS.textSecondary,
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
