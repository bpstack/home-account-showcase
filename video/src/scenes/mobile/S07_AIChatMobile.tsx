import { useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS } from '../../design/theme'
import { enter } from '../../design/motion'
import { MobileCaption, PhoneStage } from '../../components/kit/PhoneStage'
import { Scene } from '../../components/kit/Stage'
import { ChatPanel } from '../../components/screens/ChatPanel'
import { InvestmentScreen } from '../../components/screens/InvestmentScreen'

/** On a phone the sheet comes up from the bottom (frontend/components/ui/Sheet.tsx). */
const BottomSheet: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const open = enter(frame, fps, 14)
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', opacity: open }} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '90%',
          transform: `translateY(${(1 - open) * 105}%)`,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflow: 'hidden',
          borderTop: `1px solid ${COLORS.line}`,
          paddingBottom: 18,
          backgroundColor: COLORS.surface,
        }}
      >
        <ChatPanel askAt={64} answerAt={92} charsPerFrame={4.2} />
      </div>
    </>
  )
}

export const S07_AIChatMobile: React.FC = () => (
  <Scene duration={195} glowY="10%">
    <MobileCaption eyebrow="Asesor IA" icon="message" title="Pregunta lo que no sepas sobre invertir" />
    <PhoneStage title="Inversión" active="Más" overlay={<BottomSheet />}>
      <InvestmentScreen start={-200} compact />
    </PhoneStage>
  </Scene>
)
