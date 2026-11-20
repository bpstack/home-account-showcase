import { useCurrentFrame, useVideoConfig } from 'remotion'
import { enter } from '../design/motion'
import { Caption } from '../components/kit/Caption'
import { Cursor } from '../components/kit/Cursor'
import { DESKTOP_STAGE, Scene, WindowStage } from '../components/kit/Stage'
import { ChatPanel } from '../components/screens/ChatPanel'
import { InvestmentScreen } from '../components/screens/InvestmentScreen'

const OPEN_AT = 16
const s = DESKTOP_STAGE.scale

/** The investment page, dimmed, with the advisor's sheet sliding in from the right. */
const Sheet: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const open = enter(frame, fps, OPEN_AT)
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', opacity: open }} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          transform: `translateX(${(1 - open) * 500}px)`,
          borderLeft: '1px solid #2a313c',
          boxShadow: '-24px 0 60px rgba(0,0,0,0.45)',
        }}
      >
        <ChatPanel askAt={66} answerAt={94} charsPerFrame={4.2} />
      </div>
    </>
  )
}

export const S07_AIChat: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <Scene duration={195}>
      <Caption
        eyebrow="Asesor IA"
        icon="message"
        title="Pregunta lo que no sepas sobre invertir"
        style={{ position: 'absolute', top: 40, left: 0, right: 0 }}
      />
      <WindowStage
        url="homeaccount.app/investment"
        active="Inversión"
        title="Inversión"
        padded={false}
        content={<InvestmentScreen start={-200} />}
        overlay={<Sheet />}
      >
        {frame < 40 && (
          <Cursor
            frame={frame}
            appear={2}
            keys={[
              { frame: 2, x: 900 * s, y: 420 * s },
              { frame: 12, x: 1196 * s, y: 150 * s },
              { frame: 40, x: 1196 * s, y: 150 * s },
            ]}
            clicks={[OPEN_AT - 3]}
          />
        )}
      </WindowStage>
    </Scene>
  )
}
