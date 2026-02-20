import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../design/theme'

const DashboardMockup: React.FC = () => (
  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>Dashboard</div>
    {/* Mini metric cards */}
    {[
      { label: 'Ingresos', value: '3.200 €', color: COLORS.green },
      { label: 'Gastos', value: '1.850 €', color: COLORS.red },
      { label: 'Ahorro', value: '1.350 €', color: COLORS.emerald },
    ].map((c) => (
      <div key={c.label} style={{ padding: '10px 14px', backgroundColor: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: 10, color: COLORS.textMuted }}>{c.label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: c.color, marginTop: 2 }}>{c.value}</div>
      </div>
    ))}
    {/* Mini bar chart placeholder */}
    <div style={{ padding: 12, backgroundColor: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 8 }}>Últimos 6 meses</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
        {[55, 65, 50, 70, 58, 62].map((h, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, height: h, backgroundColor: COLORS.green, borderRadius: 2, opacity: 0.8 }} />
            <div style={{ flex: 1, height: h * 0.6, backgroundColor: COLORS.red, borderRadius: 2, opacity: 0.7 }} />
          </div>
        ))}
      </div>
    </div>
  </div>
)

const InvestmentMockup: React.FC = () => (
  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>Inversión</div>
    {/* Mini donut */}
    <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        {[
          { pct: 0.45, color: '#22c55e', start: 0 },
          { pct: 0.30, color: '#3b82f6', start: 0.45 },
          { pct: 0.10, color: '#f59e0b', start: 0.75 },
          { pct: 0.15, color: '#6b7280', start: 0.85 },
        ].map((s, i) => {
          const r = 38, circ = 2 * Math.PI * r
          return (
            <circle key={i} cx={50} cy={50} r={r} fill="none" stroke={s.color} strokeWidth={12}
              strokeDasharray={`${circ * s.pct} ${circ * (1 - s.pct)}`}
              strokeDashoffset={-circ * s.start}
              transform="rotate(-90 50 50)" />
          )
        })}
      </svg>
    </div>
    {/* Recommendations */}
    {[
      { name: 'MSCI World', change: '+12.4%', color: '#22c55e' },
      { name: 'Bonos EU', change: '+3.2%', color: '#3b82f6' },
      { name: 'Bitcoin', change: '+28.7%', color: '#f59e0b' },
    ].map((r) => (
      <div key={r.name} style={{ padding: '10px 14px', backgroundColor: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: COLORS.textPrimary }}>{r.name}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: r.color, fontFamily: FONTS.mono }}>{r.change}</span>
      </div>
    ))}
  </div>
)

export const S08_MobileShowcase: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 25, 360, 390], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Phones slide in from sides
  const leftPhone = spring({ frame: frame - 20, fps, config: { damping: 16, stiffness: 60, mass: 1 } })
  const rightPhone = spring({ frame: frame - 40, fps, config: { damping: 16, stiffness: 60, mass: 1 } })

  const phoneWidth = 320
  const phoneHeight = 640

  const PhoneFrame: React.FC<{ children: React.ReactNode; slideProgress: number; fromLeft?: boolean }> = ({ children, slideProgress, fromLeft = true }) => (
    <div
      style={{
        width: phoneWidth,
        height: phoneHeight,
        borderRadius: 40,
        border: `3px solid ${COLORS.bgHover}`,
        backgroundColor: COLORS.bgCard,
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        opacity: slideProgress,
        transform: `translateX(${(1 - slideProgress) * (fromLeft ? -80 : 80)}px)`,
      }}
    >
      {/* Notch */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0' }}>
        <div style={{ width: 120, height: 28, backgroundColor: '#000', borderRadius: 14 }} />
      </div>
      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 24px 8px', fontSize: 11, color: COLORS.textMuted }}>
        <span>9:41</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 16, height: 10, border: `1px solid ${COLORS.textMuted}`, borderRadius: 2, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 1, top: 1, bottom: 1, width: '70%', backgroundColor: COLORS.green, borderRadius: 1 }} />
          </div>
        </div>
      </div>
      {/* Content */}
      <div style={{ height: phoneHeight - 60, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity, backgroundColor: COLORS.bg, fontFamily: FONTS.body }}>
      {/* Title */}
      <div style={{ position: 'absolute', top: 50, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ fontSize: 18, color: COLORS.accent, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          Diseño responsive
        </span>
        <h2 style={{ fontSize: 44, fontWeight: 800, color: COLORS.textPrimary, marginTop: 10 }}>
          Perfecto en cualquier dispositivo
        </h2>
      </div>

      {/* Two phones */}
      <div style={{ position: 'absolute', top: 200, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 60, alignItems: 'flex-start' }}>
        <PhoneFrame slideProgress={leftPhone} fromLeft>
          <DashboardMockup />
        </PhoneFrame>
        <PhoneFrame slideProgress={rightPhone} fromLeft={false}>
          <InvestmentMockup />
        </PhoneFrame>
      </div>

      {/* PWA badge */}
      <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center' }}>
        {(() => {
          const badgeSpring = spring({ frame: frame - 120, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } })
          return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 28px', borderRadius: 50, backgroundColor: `${COLORS.accent}15`, border: `1px solid ${COLORS.accent}30`, opacity: badgeSpring, transform: `scale(${badgeSpring})` }}>
              <span style={{ fontSize: 20 }}>📱</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.accent }}>Progressive Web App — Instálalo como una app nativa</span>
            </div>
          )
        })()}
      </div>
    </AbsoluteFill>
  )
}
