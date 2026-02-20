import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../design/theme'

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

// Simulator line points
const SIM = {
  conservative: [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122],
  balanced: [100, 104, 107, 111, 115, 118, 122, 126, 130, 134, 138, 142],
  aggressive: [100, 108, 114, 120, 128, 124, 132, 140, 148, 155, 162, 170],
}

export const S06_Investment: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 25, 420, 450], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const containerSlide = spring({ frame, fps, config: { damping: 18, stiffness: 60, mass: 1 } })

  // Donut chart progress
  const donutProgress = interpolate(frame, [40, 120], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Simulator line draw
  const lineProgress = interpolate(frame, [250, 380], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Draw donut segments
  const donutR = 80, donutStroke = 24, cx = 100, cy = 100

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity, backgroundColor: COLORS.bg, fontFamily: FONTS.body }}>
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: 80,
          right: 80,
          bottom: 50,
          opacity: containerSlide,
          transform: `translateY(${(1 - containerSlide) * 20}px)`,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 20,
        }}
      >
        {/* Top-left: Donut chart allocation */}
        <div style={{ backgroundColor: COLORS.bgCard, borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 28, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 16, color: COLORS.textSecondary, fontWeight: 600, marginBottom: 20 }}>Distribución de cartera</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, flex: 1 }}>
            <svg width={200} height={200} viewBox="0 0 200 200">
              {(() => {
                let cumPct = 0
                return ALLOCATION.map((seg) => {
                  const pct = seg.value / 100
                  const circumference = 2 * Math.PI * donutR
                  const segLen = circumference * pct * donutProgress
                  const offset = circumference * cumPct
                  cumPct += pct
                  return (
                    <circle
                      key={seg.label}
                      cx={cx}
                      cy={cy}
                      r={donutR}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={donutStroke}
                      strokeDasharray={`${segLen} ${circumference - segLen}`}
                      strokeDashoffset={-offset}
                      strokeLinecap="round"
                      transform={`rotate(-90 ${cx} ${cy})`}
                    />
                  )
                })
              })()}
              <text x={cx} y={cy - 5} textAnchor="middle" fill={COLORS.textPrimary} fontSize="24" fontWeight="bold" fontFamily={FONTS.heading}>
                100%
              </text>
              <text x={cx} y={cy + 18} textAnchor="middle" fill={COLORS.textMuted} fontSize="12" fontFamily={FONTS.body}>
                Invertido
              </text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ALLOCATION.map((seg) => (
                <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: seg.color }} />
                  <span style={{ fontSize: 14, color: COLORS.textPrimary }}>{seg.label}</span>
                  <span style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.mono }}>{seg.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top-right: Recommendations */}
        <div style={{ backgroundColor: COLORS.bgCard, borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 28 }}>
          <div style={{ fontSize: 16, color: COLORS.textSecondary, fontWeight: 600, marginBottom: 20 }}>Recomendaciones IA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {RECOMMENDATIONS.map((rec, i) => {
              const recSpring = spring({ frame: frame - 80 - i * 20, fps, config: { damping: 14, stiffness: 100, mass: 0.6 } })
              return (
                <div
                  key={rec.name}
                  style={{
                    opacity: recSpring,
                    transform: `translateX(${(1 - recSpring) * 20}px)`,
                    padding: '16px 20px',
                    borderRadius: 12,
                    backgroundColor: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary }}>{rec.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 3 }}>{rec.type}</div>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: rec.color, fontFamily: FONTS.mono }}>
                    {rec.change}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom-left: Market data */}
        <div style={{ backgroundColor: COLORS.bgCard, borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 28 }}>
          <div style={{ fontSize: 16, color: COLORS.textSecondary, fontWeight: 600, marginBottom: 20 }}>Datos de mercado</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {MARKET.map((m, i) => {
              const mOpacity = interpolate(frame - 150 - i * 15, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              return (
                <div key={m.name} style={{ opacity: mOpacity, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < MARKET.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                  <span style={{ fontSize: 15, color: COLORS.textPrimary, fontWeight: 500 }}>{m.name}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, color: COLORS.textPrimary, fontWeight: 600, fontFamily: FONTS.mono }}>{m.value}</div>
                    <div style={{ fontSize: 13, color: COLORS.green, fontFamily: FONTS.mono }}>{m.change}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom-right: Simulator chart */}
        <div style={{ backgroundColor: COLORS.bgCard, borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 28 }}>
          <div style={{ fontSize: 16, color: COLORS.textSecondary, fontWeight: 600, marginBottom: 20 }}>Simulador a 12 meses</div>
          <svg width="100%" height={200} viewBox="0 0 440 200" preserveAspectRatio="none">
            {(Object.entries(SIM) as [string, number[]][]).map(([key, pts]) => {
              const colors: Record<string, string> = { conservative: '#6b7280', balanced: '#3b82f6', aggressive: '#22c55e' }
              const minY = 95, maxY = 175, yRange = maxY - minY
              const xStep = 440 / (pts.length - 1)
              const visibleCount = Math.ceil(pts.length * lineProgress)
              const pathParts = pts.slice(0, visibleCount).map((p, i) => {
                const x = i * xStep
                const y = 180 - ((p - 95) / yRange) * 160
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
              })
              return (
                <path
                  key={key}
                  d={pathParts.join(' ')}
                  fill="none"
                  stroke={colors[key]}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
            })}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12 }}>
            {[
              { label: 'Conservador', color: '#6b7280' },
              { label: 'Equilibrado', color: '#3b82f6' },
              { label: 'Dinámico', color: '#22c55e' },
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 3, backgroundColor: l.color, borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: COLORS.textMuted }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
