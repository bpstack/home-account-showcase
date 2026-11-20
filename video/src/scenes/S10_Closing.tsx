import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion'
import { COLORS } from '../design/theme'
import { enter, pop, progress } from '../design/motion'
import { BrandMark } from '../components/kit/Brand'
import { Icon, type IconName } from '../components/kit/Icon'
import { Scene } from '../components/kit/Stage'

const FEATURES: { icon: IconName; label: string }[] = [
  { icon: 'dashboard', label: 'Resumen del mes' },
  { icon: 'users', label: 'Cuentas compartidas' },
  { icon: 'upload', label: 'Importa tu extracto' },
  { icon: 'trendingUp', label: 'Plan de inversión' },
  { icon: 'message', label: 'Asesor IA' },
  { icon: 'lock', label: 'Cifrado de extremo a extremo' },
]

/** Brand, what the app does in six lines, and the call to action. `size` scales it. */
export const ClosingContent: React.FC<{ size?: number; columns?: number }> = ({ size = 1, columns = 3 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const mark = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 100, mass: 0.8 } })
  const title = enter(frame, fps, 8)
  const cta = pop(frame, fps, 46)
  const foot = progress(frame, 56, 66)
  const rise = (p: number) => ({ opacity: p, transform: `translateY(${(1 - p) * 16 * size}px)` })

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <div style={{ transform: `scale(${mark})` }}>
        <BrandMark size={88 * size} glow={1} />
      </div>
      <div style={{ marginTop: 24 * size, fontSize: 64 * size, fontWeight: 500, letterSpacing: '-0.02em', ...rise(title) }}>
        Home Account
      </div>
      <div style={{ marginTop: 8 * size, fontSize: 24 * size, color: COLORS.textSecondary, ...rise(title) }}>
        Control total de tu economía
      </div>

      <div
        style={{
          marginTop: 48 * size,
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, auto)`,
          columnGap: 48 * size,
          rowGap: 20 * size,
        }}
      >
        {FEATURES.map((f, i) => {
          const p = enter(frame, fps, 16 + i * 3)
          return (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 12 * size, fontSize: 20 * size, ...rise(p) }}>
              <Icon name={f.icon} size={22 * size} color={COLORS.accent} />
              {f.label}
            </div>
          )
        })}
      </div>

      <div
        style={{
          marginTop: 56 * size,
          height: 60 * size,
          padding: `0 ${36 * size}px`,
          borderRadius: 12 * size,
          backgroundColor: COLORS.accent,
          color: COLORS.accentInk,
          display: 'flex',
          alignItems: 'center',
          gap: 12 * size,
          fontSize: 24 * size,
          fontWeight: 500,
          transform: `scale(${cta})`,
          opacity: Math.min(1, cta),
          boxShadow: `0 ${16 * size}px ${48 * size}px rgba(63, 178, 188, 0.25)`,
        }}
      >
        Comenzar gratis
        <svg width={22 * size} height={22 * size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
      <div style={{ marginTop: 20 * size, fontSize: 16 * size, color: COLORS.textSecondary, opacity: foot }}>
        Gratis · Código abierto · Tus datos, solo tuyos
      </div>
    </AbsoluteFill>
  )
}

export const S10_Closing: React.FC = () => (
  <Scene duration={90} glowY="40%" glow={1.4}>
    <ClosingContent />
  </Scene>
)
