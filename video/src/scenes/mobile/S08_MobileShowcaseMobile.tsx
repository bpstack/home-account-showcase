import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

// A single large phone mockup showing the dashboard — no nested tiny phones
const AppScreenMockup: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 4px' }}>
    {/* Status bar */}
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px 4px', fontSize: 14, color: COLORS.textMuted }}>
      <span>9:41</span>
      <span>●●●</span>
    </div>

    {/* Header */}
    <div style={{ padding: '8px 20px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.textPrimary }}>Home Account</div>
      <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 2 }}>Dashboard</div>
    </div>

    {/* Stat cards */}
    <div style={{ display: 'flex', gap: 8, padding: '16px 16px 8px' }}>
      {[
        { label: 'Ingresos', value: '3.200 €', color: COLORS.green },
        { label: 'Gastos', value: '1.850 €', color: COLORS.red },
        { label: 'Ahorro', value: '1.350 €', color: COLORS.emerald },
      ].map((c) => (
        <div key={c.label} style={{ flex: 1, padding: '10px 8px', backgroundColor: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>{c.label}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: c.color }}>{c.value}</div>
        </div>
      ))}
    </div>

    {/* Bar chart */}
    <div style={{ margin: '8px 16px', padding: '12px 14px', backgroundColor: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 10, fontWeight: 600 }}>Últimos 6 meses</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
        {[
          { inc: 48, exp: 28 }, { inc: 52, exp: 32 }, { inc: 44, exp: 25 },
          { inc: 56, exp: 34 }, { inc: 50, exp: 29 }, { inc: 54, exp: 31 },
        ].map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, height: d.inc, backgroundColor: COLORS.green, borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
            <div style={{ flex: 1, height: d.exp, backgroundColor: COLORS.red, borderRadius: '3px 3px 0 0', opacity: 0.75 }} />
          </div>
        ))}
      </div>
    </div>

    {/* Recent transactions */}
    <div style={{ margin: '0 16px', padding: '12px 14px', backgroundColor: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}`, flex: 1 }}>
      <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 10, fontWeight: 600 }}>Últimas transacciones</div>
      {[
        { desc: 'Supermercado Lidl', amount: '-67,30 €', color: COLORS.red },
        { desc: 'Nómina Empresa', amount: '+3.500,00 €', color: COLORS.green },
        { desc: 'Netflix', amount: '-15,49 €', color: COLORS.red },
      ].map((tx, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? `1px solid ${COLORS.border}` : 'none' }}>
          <span style={{ fontSize: 12, color: COLORS.textPrimary }}>{tx.desc}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: tx.color, fontFamily: FONTS.mono }}>{tx.amount}</span>
        </div>
      ))}
    </div>
  </div>
)

export const S08_MobileShowcaseMobile: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sceneOpacity = interpolate(frame, [0, 12, 150, 165], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const phoneSpring = spring({ frame: frame - 10, fps, config: { damping: 16, stiffness: 55, mass: 1.1 } })
  const titleSpring = spring({ frame: frame - 5, fps, config: { damping: 18, stiffness: 70, mass: 0.9 } })
  const badgeSpring = spring({ frame: frame - 60, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } })

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        backgroundColor: COLORS.bg,
        fontFamily: FONTS.body,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 60,
        paddingTop: 100,
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 56,
          opacity: titleSpring,
          transform: `translateY(${(1 - titleSpring) * 20}px)`,
        }}
      >
        <span style={{ fontSize: 44, color: COLORS.accent, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
          Diseño responsive
        </span>
        <h2 style={{ fontSize: 72, fontWeight: 800, color: COLORS.textPrimary, marginTop: 16, lineHeight: 1.05 }}>
          Perfecto en<br />cualquier<br />dispositivo
        </h2>
      </div>

      {/* Large phone frame */}
      <div
        style={{
          width: 520,
          height: 920,
          borderRadius: 52,
          border: `3px solid ${COLORS.bgHover ?? '#27272a'}`,
          backgroundColor: COLORS.bgCard,
          overflow: 'hidden',
          boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
          opacity: phoneSpring,
          transform: `translateY(${(1 - phoneSpring) * 60}px) scale(${0.9 + phoneSpring * 0.1})`,
          flexShrink: 0,
        }}
      >
        {/* Notch */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 120, height: 28, backgroundColor: '#000', borderRadius: 14 }} />
        </div>
        <div style={{ height: 'calc(100% - 40px)', overflow: 'hidden' }}>
          <AppScreenMockup />
        </div>
      </div>

      {/* PWA badge */}
      <div
        style={{
          marginTop: 44,
          opacity: badgeSpring,
          transform: `scale(${badgeSpring})`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 16,
          padding: '20px 40px',
          borderRadius: 60,
          backgroundColor: `${COLORS.accent}15`,
          border: `2px solid ${COLORS.accent}35`,
        }}
      >
        <span style={{ fontSize: 40 }}>📱</span>
        <span style={{ fontSize: 30, fontWeight: 700, color: COLORS.accent }}>PWA — Instálalo como app nativa</span>
      </div>
    </AbsoluteFill>
  )
}
