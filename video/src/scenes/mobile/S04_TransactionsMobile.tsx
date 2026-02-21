import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

const TRANSACTIONS = [
  { date: '15 Dic', description: 'Supermercado Lidl', category: 'Alimentación', amount: -67.30, catColor: '#22c55e' },
  { date: '14 Dic', description: 'Nómina Empresa', category: 'Ingresos', amount: 3500.00, catColor: '#3b82f6' },
  { date: '13 Dic', description: 'Gasolinera Repsol', category: 'Transporte', amount: -55.20, catColor: '#f59e0b' },
  { date: '12 Dic', description: 'Netflix', category: 'Ocio', amount: -15.49, catColor: '#a855f7' },
  { date: '11 Dic', description: 'Alquiler Diciembre', category: 'Vivienda', amount: -650.00, catColor: '#f59e0b' },
]

const fmtAmount = (n: number) => {
  const abs = Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: 2 })
  return n >= 0 ? `+${abs} €` : `-${abs} €`
}

const FILTERS = ['Todas', 'Ingresos', 'Gastos']

export const S04_TransactionsMobile: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 12, 150, 165], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const slideUp = spring({ frame, fps, config: { damping: 18, stiffness: 60, mass: 1 } })

  const activeFilter = frame < 100 ? 0 : frame < 130 ? 1 : frame < 160 ? 2 : 0

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        backgroundColor: COLORS.bg,
        fontFamily: FONTS.body,
        display: 'flex',
        flexDirection: 'column',
        padding: 60,
        paddingTop: 110,
      }}
    >
      {/* Scene label */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 52,
          opacity: interpolate(frame, [0, 15, 30, 45], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        <span style={{ fontSize: 52, color: COLORS.accent, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
          Transacciones
        </span>
      </div>

      <div
        style={{
          opacity: slideUp,
          transform: `translateY(${(1 - slideUp) * 40}px)`,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: 24,
        }}
      >
        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 16 }}>
          {FILTERS.map((f, i) => {
            const filterOpacity = interpolate(frame - 20 - i * 5, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            return (
              <div
                key={f}
                style={{
                  opacity: filterOpacity,
                  padding: '16px 36px',
                  borderRadius: 40,
                  fontSize: 30,
                  fontWeight: 600,
                  backgroundColor: i === activeFilter ? COLORS.accent : COLORS.bgMuted,
                  color: i === activeFilter ? '#fff' : COLORS.textSecondary,
                }}
              >
                {f}
              </div>
            )
          })}
        </div>

        {/* Transaction rows */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {TRANSACTIONS.map((tx, i) => {
            const rowOpacity = interpolate(frame - 35 - i * 6, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            const rowSlide = interpolate(frame - 35 - i * 6, [0, 10], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '28px 32px',
                  opacity: rowOpacity,
                  transform: `translateY(${rowSlide}px)`,
                  backgroundColor: COLORS.bgCard,
                  borderRadius: 20,
                  border: `1px solid ${COLORS.border}`,
                  flex: 1,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 32, color: COLORS.textPrimary, fontWeight: 600, marginBottom: 10 }}>{tx.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 26, color: COLORS.textMuted }}>{tx.date}</span>
                    <span style={{ fontSize: 24, padding: '4px 18px', borderRadius: 16, backgroundColor: `${tx.catColor}18`, color: tx.catColor, fontWeight: 600 }}>
                      {tx.category}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 32, fontWeight: 700, color: tx.amount >= 0 ? COLORS.green : COLORS.red, fontFamily: FONTS.mono }}>
                  {fmtAmount(tx.amount)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
