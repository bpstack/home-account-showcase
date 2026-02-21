import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

export const S05_BulkImportMobile: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 12, 135, 150], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const dropZoneScale = spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 80, mass: 0.7 } })

  const fileDropped = frame > 50
  const fileDrop = spring({ frame: frame - 50, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } })

  const progressStart = 70
  const progress = interpolate(frame, [progressStart, progressStart + 50], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const aiStart = 125
  const aiCategories = [
    { name: 'Alimentación', count: 12, color: '#22c55e' },
    { name: 'Transporte', count: 8, color: '#3b82f6' },
    { name: 'Vivienda', count: 3, color: '#f59e0b' },
    { name: 'Ocio', count: 6, color: '#a855f7' },
  ]

  const rowsProcessed = Math.round(interpolate(frame, [progressStart, progressStart + 50], [0, 47], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }))

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
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <span style={{ fontSize: 40, color: COLORS.accent, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
          Importación masiva
        </span>
        <h2 style={{ fontSize: 68, fontWeight: 800, color: COLORS.textPrimary, marginTop: 16, lineHeight: 1.08 }}>
          Importa tus<br />transacciones<br />en segundos
        </h2>
      </div>

      {/* Main card */}
      <div
        style={{
          transform: `scale(${dropZoneScale})`,
          backgroundColor: COLORS.bgCard,
          borderRadius: 28,
          border: `1px solid ${COLORS.border}`,
          padding: 44,
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        {/* Drop zone */}
        <div
          style={{
            border: `2px dashed ${fileDropped ? COLORS.green : COLORS.accent}`,
            borderRadius: 20,
            padding: '44px 32px',
            textAlign: 'center',
            backgroundColor: fileDropped ? `${COLORS.green}08` : `${COLORS.accent}05`,
          }}
        >
          {!fileDropped ? (
            <>
              <div style={{ fontSize: 72, marginBottom: 20 }}>📄</div>
              <div style={{ fontSize: 34, color: COLORS.textPrimary, fontWeight: 600 }}>
                Arrastra tu archivo CSV aquí
              </div>
              <div style={{ fontSize: 28, color: COLORS.textMuted, marginTop: 12 }}>
                Compatible con la mayoría de bancos
              </div>
            </>
          ) : (
            <div style={{ opacity: fileDrop }}>
              <div style={{ fontSize: 72, marginBottom: 20 }}>✅</div>
              <div style={{ fontSize: 34, color: COLORS.green, fontWeight: 600 }}>
                movimientos_dic2024.csv
              </div>
              <div style={{ fontSize: 28, color: COLORS.textMuted, marginTop: 12 }}>
                47 transacciones detectadas
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {frame > progressStart && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 28, color: COLORS.textSecondary }}>
                Procesando... {rowsProcessed}/47 filas
              </span>
              <span style={{ fontSize: 28, color: COLORS.accent, fontWeight: 700, fontFamily: FONTS.mono }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div style={{ height: 16, backgroundColor: COLORS.bgMuted, borderRadius: 8, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.emerald})`,
                  borderRadius: 8,
                }}
              />
            </div>
          </div>
        )}

        {/* AI categories */}
        {frame > aiStart && (
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <span style={{ fontSize: 40 }}>🤖</span>
              <span style={{ fontSize: 30, color: COLORS.textPrimary, fontWeight: 700 }}>
                IA categorizando automáticamente
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {aiCategories.map((cat, i) => {
                const badgeScale = spring({
                  frame: frame - aiStart - i * 5,
                  fps,
                  config: { damping: 12, stiffness: 120, mass: 0.5 },
                })
                return (
                  <div
                    key={cat.name}
                    style={{
                      transform: `scale(${badgeScale})`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 24px',
                      borderRadius: 16,
                      backgroundColor: `${cat.color}15`,
                      border: `1px solid ${cat.color}35`,
                    }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: cat.color }} />
                    <span style={{ fontSize: 28, color: cat.color, fontWeight: 700 }}>{cat.name}</span>
                    <span style={{ fontSize: 26, color: COLORS.textMuted, fontFamily: FONTS.mono }}>{cat.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}
