import { useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS } from '../../design/theme'
import { enter, pop } from '../../design/motion'
import { MobileCaption } from '../../components/kit/PhoneStage'
import { Phone } from '../../components/kit/Phone'
import { Pill } from '../../components/kit/Primitives'
import { Scene } from '../../components/kit/Stage'
import { OverviewScreen } from '../../components/screens/OverviewScreen'
import { TransactionsScreen } from '../../components/screens/TransactionsScreen'

export const S08_MobileShowcaseMobile: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const back = enter(frame, fps, 14)
  const front = enter(frame, fps, 6)
  const badge = pop(frame, fps, 60)

  return (
    <Scene duration={165} glowY="100%">
      <MobileCaption eyebrow="En el móvil" icon="smartphone" title="La misma app, en tu bolsillo" />
      <div style={{ position: 'absolute', top: 470, left: 0, right: 0, height: 1200 }}>
        <div
          style={{
            position: 'absolute',
            left: 470,
            top: 40,
            opacity: back,
            transform: `translateX(${(1 - back) * 120}px) rotate(${4 * back}deg)`,
            transformOrigin: '50% 100%',
          }}
        >
          <Phone title="Transacciones" active="Transacciones" scale={1.2}>
            <TransactionsScreen start={20} compact />
          </Phone>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 90,
            top: 100,
            opacity: front,
            transform: `translateX(${(1 - front) * -120}px) rotate(${-3 * front}deg)`,
            transformOrigin: '50% 100%',
          }}
        >
          <Phone title="Resumen" active="Resumen" scale={1.2}>
            <OverviewScreen start={12} compact />
          </Phone>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 90,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          transform: `scale(${badge})`,
          opacity: Math.min(1, badge),
        }}
      >
        <div style={{ backgroundColor: COLORS.bg, borderRadius: 999 }}>
          <Pill icon="download" size={28}>
            Instálala como una app nativa
          </Pill>
        </div>
      </div>
    </Scene>
  )
}
