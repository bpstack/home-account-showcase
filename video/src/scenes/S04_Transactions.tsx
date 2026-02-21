import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../design/theme'

const TRANSACTIONS = [
  { date: '15 Dic', description: 'Supermercado Lidl', category: 'Alimentación', amount: -67.30, catColor: '#22c55e' },
  { date: '14 Dic', description: 'Nómina Empresa', category: 'Ingresos', amount: 3500.00, catColor: '#3b82f6' },
  { date: '13 Dic', description: 'Gasolinera Repsol', category: 'Transporte', amount: -55.20, catColor: '#f59e0b' },
  { date: '12 Dic', description: 'Netflix', category: 'Ocio', amount: -15.49, catColor: '#a855f7' },
  { date: '11 Dic', description: 'Alquiler Diciembre', category: 'Vivienda', amount: -650.00, catColor: '#f59e0b' },
  { date: '10 Dic', description: 'Farmacia', category: 'Salud', amount: -23.80, catColor: '#06b6d4' },
]

const fmtAmount = (n: number) => {
  const abs = Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: 2 })
  return n >= 0 ? `+${abs} €` : `-${abs} €`
}

const FILTERS = ['Todas', 'Ingresos', 'Gastos', 'Alimentación', 'Transporte']

export const S04_Transactions: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 12, 150, 165], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const browserSlide = spring({ frame, fps, config: { damping: 18, stiffness: 60, mass: 1 } })

  const activeFilter = frame < 100 ? 0 : frame < 130 ? 1 : frame < 160 ? 2 : 0

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity, backgroundColor: COLORS.bg, fontFamily: FONTS.body }}>
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 100,
          right: 100,
          bottom: 60,
          transform: `translateY(${(1 - browserSlide) * 30}px)`,
          opacity: browserSlide,
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`,
          overflow: 'hidden',
          backgroundColor: COLORS.bgCard,
          boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgMuted }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#22c55e' }} />
          </div>
          <div style={{ flex: 1, maxWidth: 350, margin: '0 auto', height: 26, backgroundColor: COLORS.bg, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.mono }}>homeaccount.app/transactions</span>
          </div>
        </div>

        <div style={{ display: 'flex', height: 'calc(100% - 46px)' }}>
          <div style={{ width: 190, borderRight: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgCard, paddingTop: 16 }}>
            <div style={{ padding: '8px 20px 20px', fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>
              <span style={{ color: COLORS.green }}>€</span> Home Account
            </div>
            {['Dashboard', 'Transacciones', 'Categorías', 'Presupuesto', 'Inversión'].map((item) => (
              <div
                key={item}
                style={{
                  padding: '11px 20px',
                  borderLeft: item === 'Transacciones' ? '3px solid #3b82f6' : '3px solid transparent',
                  color: item === 'Transacciones' ? COLORS.textPrimary : COLORS.textMuted,
                  fontSize: 13,
                  fontWeight: item === 'Transacciones' ? 600 : 400,
                  backgroundColor: item === 'Transacciones' ? 'rgba(59,130,246,0.08)' : 'transparent',
                }}
              >
                {item}
              </div>
            ))}
          </div>

          <div style={{ flex: 1, padding: 28, overflow: 'hidden' }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 20 }}>Transacciones</h3>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {FILTERS.map((f, i) => {
                const filterOpacity = interpolate(frame - 20 - i * 4, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                return (
                  <div
                    key={f}
                    style={{
                      opacity: filterOpacity,
                      padding: '6px 16px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: i === activeFilter ? COLORS.accent : COLORS.bgMuted,
                      color: i === activeFilter ? '#fff' : COLORS.textSecondary,
                    }}
                  >
                    {f}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`, marginBottom: 4 }}>
              <span style={{ width: 80, fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>Fecha</span>
              <span style={{ flex: 1, fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>Descripción</span>
              <span style={{ width: 120, fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>Categoría</span>
              <span style={{ width: 120, fontSize: 11, color: COLORS.textMuted, fontWeight: 600, textAlign: 'right' }}>Importe</span>
            </div>

            {TRANSACTIONS.map((tx, i) => {
              const rowOpacity = interpolate(frame - 35 - i * 5, [0, 8], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
              const rowSlide = interpolate(frame - 35 - i * 5, [0, 8], [12, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 16px',
                    opacity: rowOpacity,
                    transform: `translateY(${rowSlide}px)`,
                    backgroundColor: i % 2 === 0 ? 'transparent' : `${COLORS.bgMuted}30`,
                    borderRadius: 6,
                  }}
                >
                  <span style={{ width: 80, fontSize: 13, color: COLORS.textMuted }}>{tx.date}</span>
                  <span style={{ flex: 1, fontSize: 13, color: COLORS.textPrimary, fontWeight: 500 }}>{tx.description}</span>
                  <span style={{ width: 120 }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, backgroundColor: `${tx.catColor}18`, color: tx.catColor }}>
                      {tx.category}
                    </span>
                  </span>
                  <span style={{ width: 120, fontSize: 14, fontWeight: 600, textAlign: 'right', color: tx.amount >= 0 ? COLORS.green : COLORS.red, fontFamily: FONTS.mono }}>
                    {fmtAmount(tx.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
