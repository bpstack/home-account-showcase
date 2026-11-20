import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion'
import { COLORS } from '../design/theme'
import { enter, pop } from '../design/motion'
import { BrandMark } from '../components/kit/Brand'
import { Pill } from '../components/kit/Primitives'
import { Scene } from '../components/kit/Stage'

export const INTRO_BADGES = [
  { text: 'Cifrado de extremo a extremo', icon: 'lock' as const },
  { text: 'App instalable (PWA)', icon: 'smartphone' as const },
  { text: 'Código abierto', icon: 'code' as const },
]

/** The brand, the promise and three badges. Shared by both videos (`size` scales it). */
export const IntroContent: React.FC<{ size?: number; stackBadges?: boolean }> = ({ size = 1, stackBadges = false }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const mark = spring({ frame: frame - 4, fps, config: { damping: 14, stiffness: 90, mass: 0.9 } })
  const title = enter(frame, fps, 16)
  const sub = enter(frame, fps, 26)
  const rise = (p: number) => ({ opacity: p, transform: `translateY(${(1 - p) * 24 * size}px)` })

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <div style={{ transform: `scale(${mark}) rotate(${(1 - mark) * -12}deg)`, opacity: mark }}>
        <BrandMark size={128 * size} glow={1} />
      </div>
      <div style={{ marginTop: 40 * size, fontSize: 92 * size, fontWeight: 500, letterSpacing: '-0.025em', ...rise(title) }}>
        Home Account
      </div>
      <div style={{ marginTop: 12 * size, fontSize: 32 * size, color: COLORS.textSecondary, ...rise(sub) }}>
        Control total de tu economía
      </div>
      <div
        style={{
          marginTop: 48 * size,
          display: 'flex',
          flexDirection: stackBadges ? 'column' : 'row',
          alignItems: 'center',
          gap: 16 * size,
        }}
      >
        {INTRO_BADGES.map((badge, i) => {
          const s = pop(frame, fps, 42 + i * 5)
          return (
            <div key={badge.text} style={{ transform: `scale(${s})`, opacity: Math.min(1, s) }}>
              <Pill icon={badge.icon} size={18 * size} color={i === 0 ? COLORS.accent : COLORS.textSecondary}>
                {badge.text}
              </Pill>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

export const S01_Intro: React.FC = () => (
  <Scene duration={90} glowY="45%" glow={1.6}>
    <IntroContent />
  </Scene>
)
