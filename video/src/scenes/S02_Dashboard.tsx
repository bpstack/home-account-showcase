import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../design/theme'

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
  { name: 'Otros', value: 270, color: '#06b6d4' },
]

const fmt = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 0 })

const SidebarItem: React.FC<{ label: string; active?: boolean }> = ({ label, active }) => (
  <div
    style={{
      padding: '12px 20px',
      borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
      color: active ? COLORS.textPrimary : COLORS.textMuted,
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      backgroundColor: active ? 'rgba(59,130,246,0.08)' : 'transparent',
      fontFamily: FONTS.body,
      cursor: 'default',
    }}
  >
    {label}
  </div>
)

export const S02_Dashboard: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 12, 180, 195], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const browserSlide = spring({ frame, fps, config: { damping: 20, stiffness: 60, mass: 1 } })

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
    <AbsoluteFill style={{ opacity: sceneOpacity, backgroundColor: COLORS.bg, fontFamily: FONTS.body }}>
      <div
        style={{
          position: 'absolute',
          top: 30,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: interpolate(frame, [0, 15, 30, 45], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        <span style={{ fontSize: 20, color: COLORS.accent, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          Dashboard
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 80,
          right: 80,
          bottom: 60,
          transform: `translateY(${(1 - browserSlide) * 40}px)`,
          opacity: browserSlide,
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`,
          overflow: 'hidden',
          backgroundColor: COLORS.bgCard,
          boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgMuted }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#22c55e' }} />
          </div>
          <div style={{ flex: 1, maxWidth: 400, margin: '0 auto', height: 28, backgroundColor: COLORS.bg, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.mono }}>homeaccount.app/dashboard</span>
          </div>
        </div>

        <div style={{ display: 'flex', height: 'calc(100% - 52px)' }}>
          <div style={{ width: 200, borderRight: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgCard, paddingTop: 16 }}>
            <div style={{ padding: '8px 20px 20px', fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>
              <span style={{ color: COLORS.green }}>€</span> Home Account
            </div>
            {['Dashboard', 'Transacciones', 'Categorías', 'Presupuesto', 'Inversión'].map((item) => (
              <SidebarItem key={item} label={item} active={item === 'Dashboard'} />
            ))}
          </div>

          <div style={{ flex: 1, padding: 32, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 32 }}>
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
                      backgroundColor: COLORS.bg,
                      borderRadius: 12,
                      padding: '20px 24px',
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 8 }}>{card.title}</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: card.color }}>
                      {fmt(displayVal)}{card.suffix}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ flex: 1.5, backgroundColor: COLORS.bg, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, fontWeight: 600 }}>Ingresos vs Gastos</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180 }}>
                  {MONTHLY_DATA.map((d) => {
                    const incH = (d.income / maxVal) * 160 * barChartProgress
                    const expH = (d.expense / maxVal) * 160 * barChartProgress
                    return (
                      <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 160 }}>
                          <div style={{ width: 18, height: incH, backgroundColor: COLORS.green, borderRadius: '4px 4px 0 0' }} />
                          <div style={{ width: 18, height: expH, backgroundColor: COLORS.red, borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
                        </div>
                        <span style={{ fontSize: 10, color: COLORS.textMuted }}>{d.month}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ flex: 1, backgroundColor: COLORS.bg, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, fontWeight: 600 }}>Categorías</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={160} height={160} viewBox="0 0 160 160">
                    {(() => {
                      let cumAngle = -90
                      return CATEGORIES.map((cat, i) => {
                        const angle = (cat.value / total) * 360 * pieProgress
                        const startAngle = cumAngle
                        cumAngle += (cat.value / total) * 360
                        const endAngle = startAngle + angle
                        const startRad = (startAngle * Math.PI) / 180
                        const endRad = (endAngle * Math.PI) / 180
                        const cx = 80, cy = 80, r = 60
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
                    <circle cx={80} cy={80} r={35} fill={COLORS.bg} />
                  </svg>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                  {CATEGORIES.map((cat) => (
                    <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cat.color }} />
                      <span style={{ fontSize: 10, color: COLORS.textMuted }}>{cat.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
