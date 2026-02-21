import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

const ALLOCATION = [
  { label: 'Acciones', value: 45, color: '#22c55e' },
  { label: 'Bonos', value: 30, color: '#3b82f6' },
  { label: 'Crypto', value: 10, color: '#f59e0b' },
  { label: 'Liquidez', value: 15, color: '#6b7280' },
]

const RECOMMENDATIONS = [
  { name: 'MSCI World ETF', type: 'ETF', change: '+12.4%', color: '#22c55e' },
  { name: 'Bonos Europeos Gov', type: 'Bonos', change: '+3.2%', color: '#3b82f6' },
  { name: 'Bitcoin', type: 'Crypto', change: '+28.7%', color: '#f59e0b' },
]

const MARKET = [
  { name: 'S&P 500', value: '5.234,18', change: '+1.2%' },
  { name: 'Bitcoin', value: '91.234 €', change: '+3.8%' },
  { name: 'MSCI World', value: '3.456,78', change: '+0.7%' },
]

export const S06_InvestmentMobile: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 12, 180, 195], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const slideUp = spring({ frame, fps, config: { damping: 18, stiffness: 60, mass: 1 } })

  const donutProgress = interpolate(frame, [20, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

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
          marginBottom: 48,
          opacity: interpolate(frame, [0, 15, 30, 45], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        <span style={{ fontSize: 52, color: COLORS.accent, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
          Inversiones
        </span>
      </div>

      <div
        style={{
          opacity: slideUp,
          transform: `translateY(${(1 - slideUp) * 40}px)`,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: 28,
        }}
      >
        {/* Portfolio donut */}
        <div style={{ backgroundColor: COLORS.bgCard, borderRadius: 24, padding: '36px 40px', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 48 }}>
          <svg width={180} height={180} viewBox="0 0 100 100">
            {(() => {
              let cumPct = 0
              const r = 35, stroke = 12, cx = 50, cy = 50
              return ALLOCATION.map((seg) => {
                const pct = seg.value / 100
                const circumference = 2 * Math.PI * r
                const segLen = circumference * pct * donutProgress
                const offset = circumference * cumPct
                cumPct += pct
                return (
                  <circle
                    key={seg.label}
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={stroke}
                    strokeDasharray={`${segLen} ${circumference - segLen}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`}
                  />
                )
              })
            })()}
            <circle cx={50} cy={50} r={22} fill={COLORS.bgCard} />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {ALLOCATION.map((seg) => (
              <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: seg.color, flexShrink: 0 }} />
                <span style={{ fontSize: 28, color: COLORS.textPrimary }}>{seg.label}</span>
                <span style={{ fontSize: 28, color: COLORS.textMuted, fontFamily: FONTS.mono }}>{seg.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div style={{ backgroundColor: COLORS.bgCard, borderRadius: 24, padding: '32px 40px', border: `1px solid ${COLORS.border}`, flex: 1 }}>
          <div style={{ fontSize: 32, color: COLORS.textSecondary, fontWeight: 700, marginBottom: 24 }}>Recomendaciones IA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {RECOMMENDATIONS.map((rec, i) => {
              const recSpring = spring({ frame: frame - 40 - i * 10, fps, config: { damping: 14, stiffness: 100, mass: 0.6 } })
              return (
                <div
                  key={rec.name}
                  style={{
                    opacity: recSpring,
                    transform: `translateX(${(1 - recSpring) * 30}px)`,
                    padding: '22px 28px',
                    borderRadius: 16,
                    backgroundColor: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 30, fontWeight: 700, color: COLORS.textPrimary }}>{rec.name}</div>
                    <div style={{ fontSize: 24, color: COLORS.textMuted, marginTop: 4 }}>{rec.type}</div>
                  </div>
                  <span style={{ fontSize: 32, fontWeight: 700, color: rec.color, fontFamily: FONTS.mono }}>
                    {rec.change}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Market data */}
        <div style={{ backgroundColor: COLORS.bgCard, borderRadius: 24, padding: '32px 40px', border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 32, color: COLORS.textSecondary, fontWeight: 700, marginBottom: 20 }}>Datos de mercado</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {MARKET.map((m, i) => {
              const mOpacity = interpolate(frame - 75 - i * 8, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              return (
                <div
                  key={m.name}
                  style={{
                    opacity: mOpacity,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 0',
                    borderBottom: i < MARKET.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                  }}
                >
                  <span style={{ fontSize: 30, color: COLORS.textPrimary, fontWeight: 600 }}>{m.name}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 30, color: COLORS.textPrimary, fontWeight: 700, fontFamily: FONTS.mono }}>{m.value}</span>
                    <span style={{ fontSize: 26, color: COLORS.green, fontFamily: FONTS.mono, marginLeft: 16 }}>{m.change}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
