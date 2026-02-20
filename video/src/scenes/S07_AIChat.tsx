import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../design/theme'

const USER_MSG = '¿Qué ETFs recomiendas para un perfil equilibrado?'
const AI_RESPONSE = `Para un perfil equilibrado, te recomiendo considerar una combinación de:

• MSCI World ETF (60%) — Diversificación global en mercados desarrollados
• Bonos Europeos Gov (30%) — Estabilidad y rendimiento predecible
• Bitcoin ETF (10%) — Exposición controlada a crecimiento potencial

Esta distribución ofrece un balance óptimo entre rendimiento esperado y riesgo controlado, con un horizonte recomendado de 3-5 años.`

const QUICK_QUESTIONS = [
  '¿Cómo diversificar?',
  'Análisis de mi cartera',
  'Perfil de riesgo',
  'Mejores fondos 2024',
]

export const S07_AIChat: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 25, 420, 450], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // User bubble entrance
  const userBubbleSpring = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 80, mass: 0.7 } })

  // Typing indicator (90-150)
  const showTyping = frame > 90 && frame < 160
  const dot1 = Math.sin(frame * 0.3) * 0.5 + 0.5
  const dot2 = Math.sin(frame * 0.3 + 1) * 0.5 + 0.5
  const dot3 = Math.sin(frame * 0.3 + 2) * 0.5 + 0.5

  // AI response typewriter (from frame 160)
  const aiStart = 160
  const charsPerFrame = 2.5
  const aiCharsVisible = Math.floor(Math.max(0, (frame - aiStart) * charsPerFrame))
  const aiText = AI_RESPONSE.slice(0, Math.min(aiCharsVisible, AI_RESPONSE.length))
  const aiDone = aiCharsVisible >= AI_RESPONSE.length

  // AI bubble entrance
  const aiBubbleSpring = spring({ frame: frame - aiStart, fps, config: { damping: 16, stiffness: 70, mass: 0.8 } })

  // Quick questions appear after AI finishes
  const quickStart = 370

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity, backgroundColor: COLORS.bg, fontFamily: FONTS.body }}>
      {/* Title */}
      <div style={{ position: 'absolute', top: 40, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ fontSize: 18, color: COLORS.accent, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          Chat IA
        </span>
      </div>

      {/* Chat container */}
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
        {/* Chat header */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 18 }}>🤖</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary }}>Asistente de Inversión</div>
            <div style={{ fontSize: 12, color: COLORS.green }}>● En línea</div>
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
          {/* User message */}
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

          {/* Typing indicator */}
          {showTyping && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 4, padding: '14px 20px', borderRadius: '18px 18px 18px 4px', backgroundColor: COLORS.bgMuted }}>
              {[dot1, dot2, dot3].map((d, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS.textMuted, opacity: 0.4 + d * 0.6 }} />
              ))}
            </div>
          )}

          {/* AI response */}
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

        {/* Quick questions */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10 }}>Preguntas rápidas</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_QUESTIONS.map((q, i) => {
              const qScale = spring({ frame: frame - quickStart - i * 8, fps, config: { damping: 12, stiffness: 120, mass: 0.5 } })
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
