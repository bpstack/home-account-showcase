import { useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS } from '../design/theme'
import { enter, pop } from '../design/motion'
import { Caption } from '../components/kit/Caption'
import { Phone } from '../components/kit/Phone'
import { Pill } from '../components/kit/Primitives'
import { Scene } from '../components/kit/Stage'
import { InvestmentScreen } from '../components/screens/InvestmentScreen'
import { OverviewScreen } from '../components/screens/OverviewScreen'
import { TransactionsScreen } from '../components/screens/TransactionsScreen'

export const S08_MobileShowcase: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const phones = [
    { title: 'Transacciones', active: 'Transacciones', delay: 14, scale: 0.86, lift: 46, screen: <TransactionsScreen start={20} compact /> },
    { title: 'Resumen', active: 'Resumen', delay: 6, scale: 0.94, lift: 0, screen: <OverviewScreen start={12} compact /> },
    { title: 'Inversión', active: 'Más', delay: 22, scale: 0.86, lift: 46, screen: <InvestmentScreen start={26} compact /> },
  ]
  const badge = pop(frame, fps, 60)

  return (
    <Scene duration={165} glowY="100%">
      <Caption
        eyebrow="En el móvil"
        icon="smartphone"
        title="La misma app, en tu bolsillo"
        style={{ position: 'absolute', top: 40, left: 0, right: 0 }}
      />
      <div
        style={{
          position: 'absolute',
          top: 168,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: 56,
        }}
      >
        {phones.map((p, i) => {
          const e = enter(frame, fps, p.delay)
          const side = i === 0 ? -1 : i === 2 ? 1 : 0
          return (
            <div
              key={p.title}
              style={{
                marginTop: p.lift,
                opacity: e,
                transform: `translate(${(1 - e) * side * 80}px, ${(1 - e) * 80}px)`,
              }}
            >
              <Phone title={p.title} active={p.active} scale={p.scale}>
                {p.screen}
              </Phone>
            </div>
          )
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 36,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          transform: `scale(${badge})`,
          opacity: Math.min(1, badge),
        }}
      >
        <div style={{ backgroundColor: COLORS.bg, borderRadius: 999 }}>
          <Pill icon="download" size={20}>
            Instálala desde el navegador, como una app nativa
          </Pill>
        </div>
      </div>
    </Scene>
  )
}
