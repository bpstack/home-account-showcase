import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../design/theme'

export const S05_BulkImport: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 25, 330, 360], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Phase 1: Drop zone (0-100)
  const dropZoneScale = spring({ frame: frame - 20, fps, config: { damping: 14, stiffness: 80, mass: 0.7 } })

  // Phase 2: File dropped (100-140)
  const fileDropped = frame > 100
  const fileDrop = spring({ frame: frame - 100, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } })

  // Phase 3: Progress bar (140-240)
  const progressStart = 140
  const progress = interpolate(frame, [progressStart, progressStart + 100], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Phase 4: AI categorization badges (240+)
  const aiStart = 250
  const aiCategories = [
    { name: 'Alimentación', count: 12, color: '#22c55e' },
    { name: 'Transporte', count: 8, color: '#3b82f6' },
    { name: 'Vivienda', count: 3, color: '#f59e0b' },
    { name: 'Ocio', count: 6, color: '#a855f7' },
    { name: 'Salud', count: 4, color: '#06b6d4' },
  ]

  // Rows count
  const rowsProcessed = Math.round(interpolate(frame, [progressStart, progressStart + 100], [0, 47], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }))

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity, backgroundColor: COLORS.bg, fontFamily: FONTS.body }}>
      {/* Title */}
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ fontSize: 18, color: COLORS.accent, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          Importación masiva
        </span>
        <h2 style={{ fontSize: 44, fontWeight: 800, color: COLORS.textPrimary, marginTop: 10 }}>
          Importa tus transacciones en segundos
        </h2>
      </div>

      {/* Central card */}
      <div
        style={{
          position: 'absolute',
          top: 220,
          left: '50%',
          transform: `translateX(-50%) scale(${dropZoneScale})`,
          width: 700,
          backgroundColor: COLORS.bgCard,
          borderRadius: 20,
          border: `1px solid ${COLORS.border}`,
          padding: 40,
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Drop zone */}
        <div
          style={{
            border: `2px dashed ${fileDropped ? COLORS.green : COLORS.accent}`,
            borderRadius: 16,
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: fileDropped ? `${COLORS.green}08` : `${COLORS.accent}05`,
            transition: 'all 0.3s',
            marginBottom: 24,
          }}
        >
          {!fileDropped ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 18, color: COLORS.textPrimary, fontWeight: 600 }}>
                Arrastra tu archivo CSV aquí
              </div>
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 8 }}>
                Compatible con la mayoría de bancos
              </div>
            </>
          ) : (
            <div style={{ opacity: fileDrop }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 18, color: COLORS.green, fontWeight: 600 }}>
                movimientos_dic2024.csv
              </div>
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 8 }}>
                47 transacciones detectadas
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {frame > progressStart && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: COLORS.textSecondary }}>
                Procesando... {rowsProcessed}/47 filas
              </span>
              <span style={{ fontSize: 14, color: COLORS.accent, fontWeight: 600, fontFamily: FONTS.mono }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div style={{ height: 8, backgroundColor: COLORS.bgMuted, borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.emerald})`,
                  borderRadius: 4,
                  transition: 'width 0.1s',
                }}
              />
            </div>
          </div>
        )}

        {/* AI categorization badges */}
        {frame > aiStart && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <span style={{ fontSize: 15, color: COLORS.textPrimary, fontWeight: 600 }}>
                IA categorizando automáticamente
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {aiCategories.map((cat, i) => {
                const badgeScale = spring({
                  frame: frame - aiStart - i * 10,
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
                      gap: 8,
                      padding: '8px 16px',
                      borderRadius: 12,
                      backgroundColor: `${cat.color}15`,
                      border: `1px solid ${cat.color}30`,
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cat.color }} />
                    <span style={{ fontSize: 13, color: cat.color, fontWeight: 600 }}>{cat.name}</span>
                    <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.mono }}>{cat.count}</span>
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
