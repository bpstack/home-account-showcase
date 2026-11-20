import React from 'react'
import { interpolate, Easing, useCurrentFrame } from 'remotion'
import { COLORS } from '../../design/theme'
import { formatMoney } from '../../design/money'
import { progress } from '../../design/motion'
import { MARKETS, MONTHLY_AVG, PLAN, SIMULATION } from '../../data/demo'
import { Button, Money, Segmented, SectionTitle } from '../kit/Primitives'
import { Figures } from './Figures'

const fade = (p: number): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * 10}px)` })

const Plan: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame()
  const bar = progress(frame, start + 8, start + 34)
  const eased = 1 - Math.pow(1 - bar, 3)
  return (
    <div style={fade(progress(frame, start, start + 12))}>
      <SectionTitle>Plan del mes</SectionTitle>
      <div style={{ fontSize: 14, color: COLORS.textSecondary }}>
        Inviertes <Money value={PLAN.total} tone="neutral" size={20} weight={500} /> al mes: el {PLAN.share} % de lo que ahorras.
      </div>
      <div style={{ marginTop: 16, height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: COLORS.line, display: 'flex' }}>
        {PLAN.allocation.map((part) => (
          <div key={part.label} style={{ width: `${part.value * eased}%`, backgroundColor: part.color }} />
        ))}
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 12, color: COLORS.textSecondary }}>
        {PLAN.allocation.map((part) => (
          <span key={part.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: part.color }} />
            {part.label} {part.value} %
          </span>
        ))}
      </div>
      <div style={{ marginTop: 16, borderTop: `1px solid ${COLORS.line}`, borderBottom: `1px solid ${COLORS.line}` }}>
        {PLAN.items.map((item, i) => (
          <div
            key={item.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderTop: i === 0 ? 'none' : `1px solid ${COLORS.line}`,
              ...fade(progress(frame, start + 20 + i * 6, start + 32 + i * 6)),
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
              <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                {item.isin && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{item.isin} · </span>}
                {item.risk}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Money value={item.amount} tone="neutral" weight={500} size={14} />
              <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{item.pct} %</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const Slider: React.FC<{ label: string; value: string; share: number }> = ({ label, value, share }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: COLORS.textSecondary }}>{label}</span>
      <span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
    <div style={{ position: 'relative', marginTop: 10, height: 6, borderRadius: 3, backgroundColor: COLORS.line }}>
      <div style={{ width: `${share}%`, height: '100%', borderRadius: 3, backgroundColor: COLORS.accent }} />
      <div
        style={{
          position: 'absolute',
          left: `${share}%`,
          top: -5,
          width: 16,
          height: 16,
          marginLeft: -8,
          borderRadius: 8,
          backgroundColor: COLORS.text,
          border: `3px solid ${COLORS.accent}`,
        }}
      />
    </div>
  </div>
)

const Simulator: React.FC<{ start: number; compact: boolean }> = ({ start, compact }) => {
  const frame = useCurrentFrame()
  const draw = progress(frame, start + 10, start + 50)
  const W = compact ? 358 : 560
  const H = compact ? 150 : 190
  const max = 80000
  const pad = { l: 56, b: 22 }
  const x = (i: number) => pad.l + (i / SIMULATION.years) * (W - pad.l - 8)
  const y = (v: number) => (H - pad.b) - (v / max) * (H - pad.b - 8)
  const path = (pts: number[]) => pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ')
  const length = 1200
  const outcomes = [
    { label: 'Pesimista', value: SIMULATION.pessimistic[10], strong: false },
    { label: 'Esperado', value: SIMULATION.expected[10], strong: true },
    { label: 'Optimista', value: SIMULATION.optimistic[10], strong: false },
  ]
  const ticks = [0, 20000, 40000, 60000, 80000]

  return (
    <div style={fade(progress(frame, start, start + 12))}>
      <SectionTitle>Simulador</SectionTitle>
      <Segmented options={['Conservador', 'Equilibrado', 'Dinámico']} active={1} stretch />
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Slider label="Capital inicial" value={formatMoney(10000)} share={20} />
        <Slider label="Aportación al mes" value={formatMoney(300)} share={15} />
        <Slider label="Plazo" value="10 años" share={31} />
      </div>
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {outcomes.map((o) => (
          <div key={o.label}>
            <div style={{ fontSize: compact ? 12 : 14, color: COLORS.textSecondary }}>{o.label}</div>
            <Money value={o.value * draw} tone="neutral" weight={o.strong ? 700 : 500} size={compact ? 14 : 16} />
          </div>
        ))}
      </div>
      <svg width={W} height={H} style={{ marginTop: 12, display: 'block', overflow: 'visible' }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W} y1={y(t)} y2={y(t)} stroke={COLORS.line} strokeWidth={1} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={COLORS.textSecondary}>
              {t === 0 ? '0 €' : `${t / 1000} mil €`}
            </text>
          </g>
        ))}
        {[0, 2, 4, 6, 8, 10].map((i) => (
          <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize={11} fill={COLORS.textSecondary}>
            {i === 0 ? 'Hoy' : `${i} años`}
          </text>
        ))}
        {(['pessimistic', 'optimistic', 'expected'] as const).map((key) => (
          <path
            key={key}
            d={path(SIMULATION[key])}
            fill="none"
            stroke={key === 'expected' ? COLORS.accent : COLORS.textSecondary}
            strokeWidth={key === 'expected' ? 2.5 : 1.5}
            strokeDasharray={`${length} ${length}`}
            strokeDashoffset={length * (1 - draw)}
            opacity={key === 'expected' ? 1 : 0.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  )
}

const SidePanels: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame()
  const fund = progress(frame, start + 14, start + 40)
  const fundShare = 72 * (1 - Math.pow(1 - fund, 3))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={fade(progress(frame, start, start + 12))}>
        <SectionTitle right={<Button variant="ghost" size="sm">Repetir test</Button>}>Tu perfil</SectionTitle>
        <div style={{ fontSize: 16, fontWeight: 500 }}>
          Equilibrado <span style={{ fontWeight: 400, color: COLORS.textSecondary }}>· 15 años de horizonte</span>
        </div>
        <div style={{ marginTop: 4, fontSize: 14, color: COLORS.textSecondary }}>
          Buscas un equilibrio entre riesgo y rentabilidad.
        </div>
      </div>

      <div style={fade(progress(frame, start + 8, start + 20))}>
        <SectionTitle right={<Button variant="ghost" size="sm">Editar</Button>}>Fondo de emergencia</SectionTitle>
        <div style={{ fontSize: 14, color: COLORS.textSecondary }}>
          <Money value={9676.8} tone="neutral" weight={500} size={16} /> de <Money value={13440} tone="neutral" /> (6 meses de gastos)
        </div>
        <div style={{ marginTop: 12, height: 8, borderRadius: 4, backgroundColor: COLORS.line, overflow: 'hidden' }}>
          <div style={{ width: `${fundShare}%`, height: '100%', borderRadius: 4, backgroundColor: COLORS.accent }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: COLORS.textSecondary }}>{Math.round(fundShare)} % cubierto</div>
      </div>

      <div style={fade(progress(frame, start + 16, start + 28))}>
        <SectionTitle right={<span style={{ fontSize: 12, color: COLORS.textSecondary }}>Actualizado hace 5 minutos</span>}>
          Mercados
        </SectionTitle>
        <div style={{ display: 'flex', fontSize: 12, color: COLORS.textSecondary, fontWeight: 500, paddingBottom: 8 }}>
          <span style={{ flex: 1 }}>Mercado</span>
          <span style={{ width: 100, textAlign: 'right' }}>Valor</span>
          <span style={{ width: 70, textAlign: 'right' }}>Hoy</span>
        </div>
        <div style={{ borderTop: `1px solid ${COLORS.line}`, paddingTop: 6 }}>
          {MARKETS.map((m, i) => (
            <div
              key={m.name}
              style={{ display: 'flex', fontSize: 14, padding: '6px 0', ...fade(progress(frame, start + 22 + i * 4, start + 32 + i * 4)) }}
            >
              <span style={{ flex: 1 }}>{m.name}</span>
              <span style={{ width: 100, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.value}</span>
              <span style={{ width: 70, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: COLORS.textSecondary }}>{m.change}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Inversión (frontend/app/(private)/investment): monthly averages, the plan of the month, the
 * simulator, the risk profile, the emergency fund and the markets. Between `scrollAt` and
 * `scrollAt + 40` the page scrolls down by `scrollBy` px to bring the simulator into view.
 */
export const InvestmentScreen: React.FC<{
  start?: number
  compact?: boolean
  scrollAt?: number
  scrollBy?: number
}> = ({ start = 0, compact = false, scrollAt = 9999, scrollBy = 0 }) => {
  const frame = useCurrentFrame()
  const scroll = interpolate(frame, [scrollAt, scrollAt + 40], [0, scrollBy], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  })
  // Drawn as it scrolls into view; without a scroll, right after the plan
  const simulatorAt = scrollBy > 0 ? scrollAt - 10 : start + 44

  return (
    <div style={{ padding: compact ? 16 : 24, transform: `translateY(${-scroll}px)` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, ...fade(progress(frame, start, start + 10)) }}>
        <div style={{ paddingTop: 8, fontSize: compact ? 13 : 14, color: COLORS.textSecondary }}>
          Media de 6 meses · 214 transacciones
        </div>
        <Button icon="message">Asesor IA</Button>
      </div>
      <div style={{ marginTop: 12 }}>
        <Figures
          income={MONTHLY_AVG.income}
          expenses={MONTHLY_AVG.expenses}
          labels={['Ingresos al mes', 'Gastos al mes', 'Ahorro al mes']}
          start={start + 4}
          compact={compact}
        />
      </div>
      <div
        style={{
          marginTop: 32,
          display: 'grid',
          gridTemplateColumns: compact ? 'minmax(0, 1fr)' : 'minmax(0, 3fr) minmax(0, 2fr)',
          gap: 32,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, minWidth: 0 }}>
          <Plan start={start + 18} />
          {!compact && <Simulator start={simulatorAt} compact={false} />}
        </div>
        {!compact && <SidePanels start={start + 30} />}
        {compact && <Simulator start={simulatorAt} compact />}
      </div>
    </div>
  )
}
