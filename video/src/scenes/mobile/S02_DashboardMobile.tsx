import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

const MONTHLY_DATA = [
  { month: 'Jul', income: 3200, expense: 1850 },
  { month: 'Ago', income: 3400, expense: 2100 },
  { month: 'Sep', income: 3100, expense: 1750 },
  { month: 'Oct', income: 3600, expense: 2200 },
  { month: 'Nov', income: 3300, expense: 1900 },
  { month: 'Dic', income: 3500, expense: 2050 },
]

const CATEGORIES = [
  { name: 'Alimentación', value: 450, color: '#22c55e' },
  { name: 'Transporte', value: 280, color: '#3b82f6' },
  { name: 'Vivienda', value: 650, color: '#f59e0b' },
  { name: 'Ocio', value: 200, color: '#a855f7' },
]

const fmt = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 0 })

export const S02_DashboardMobile: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 12, 180, 195], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const slideUp = spring({ frame, fps, config: { damping: 20, stiffness: 60, mass: 1 } })

  const cards = [
    { title: 'Ingresos', value: 3200, color: COLORS.green, suffix: ' €' },
    { title: 'Gastos', value: 1850, color: COLORS.red, suffix: ' €' },
    { title: 'Ahorro', value: 1350, color: COLORS.emerald, suffix: ' €' },
  ]

  const maxVal = 3600
  const barChartProgress = interpolate(frame, [60, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const pieProgress = interpolate(frame, [100, 150], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const total = CATEGORIES.reduce((s, c) => s + c.value, 0)

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
          Dashboard
        </span>
      </div>

      <div
        style={{
          opacity: slideUp,
          transform: `translateY(${(1 - slideUp) * 40}px)`,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: 32,
        }}
      >
        {/* 3 stat cards */}
        <div style={{ display: 'flex', gap: 20 }}>
          {cards.map((card, i) => {
            const cardScale = spring({ frame: frame - 20 - i * 8, fps, config: { damping: 14, stiffness: 100, mass: 0.6 } })
            const countProgress = interpolate(frame, [30 + i * 8, 55 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            const displayVal = Math.round(card.value * countProgress)
            return (
              <div
                key={card.title}
                style={{
                  flex: 1,
                  transform: `scale(${cardScale})`,
                  backgroundColor: COLORS.bgCard,
                  borderRadius: 24,
                  padding: '32px 16px',
                  border: `1px solid ${COLORS.border}`,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 28, color: COLORS.textMuted, marginBottom: 12 }}>{card.title}</div>
                <div style={{ fontSize: 52, fontWeight: 700, color: card.color, lineHeight: 1 }}>
                  {fmt(displayVal)}{card.suffix}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bar chart */}
        <div style={{ flex: 1.4, backgroundColor: COLORS.bgCard, borderRadius: 24, padding: '36px 40px', border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 34, color: COLORS.textSecondary, marginBottom: 28, fontWeight: 600 }}>Ingresos vs Gastos</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, height: 260, flex: 1 }}>
            {MONTHLY_DATA.map((d) => {
              const incH = (d.income / maxVal) * 220 * barChartProgress
              const expH = (d.expense / maxVal) * 220 * barChartProgress
              return (
                <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 220 }}>
                    <div style={{ width: 24, height: incH, backgroundColor: COLORS.green, borderRadius: '6px 6px 0 0' }} />
                    <div style={{ width: 24, height: expH, backgroundColor: COLORS.red, borderRadius: '6px 6px 0 0', opacity: 0.8 }} />
                  </div>
                  <span style={{ fontSize: 24, color: COLORS.textMuted }}>{d.month}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pie chart */}
        <div style={{ flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 24, padding: '36px 40px', border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 34, color: COLORS.textSecondary, marginBottom: 28, fontWeight: 600 }}>Categorías</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 56 }}>
            <svg width={180} height={180} viewBox="0 0 180 180">
              {(() => {
                let cumAngle = -90
                return CATEGORIES.map((cat, i) => {
                  const angle = (cat.value / total) * 360 * pieProgress
                  const startAngle = cumAngle
                  cumAngle += (cat.value / total) * 360
                  const endAngle = startAngle + angle
                  const startRad = (startAngle * Math.PI) / 180
                  const endRad = (endAngle * Math.PI) / 180
                  const cx = 90, cy = 90, r = 70
                  const x1 = cx + r * Math.cos(startRad)
                  const y1 = cy + r * Math.sin(startRad)
                  const x2 = cx + r * Math.cos(endRad)
                  const y2 = cy + r * Math.sin(endRad)
                  const largeArc = angle > 180 ? 1 : 0
                  if (angle < 0.5) return null
                  return (
                    <path
                      key={i}
                      d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={cat.color}
                      opacity={0.85}
                    />
                  )
                })
              })()}
              <circle cx={90} cy={90} r={38} fill={COLORS.bgCard} />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {CATEGORIES.map((cat) => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 28, color: COLORS.textPrimary }}>{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
