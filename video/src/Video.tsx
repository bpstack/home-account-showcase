import { AbsoluteFill, Audio, Sequence, staticFile, interpolate, useCurrentFrame } from 'remotion'
import { S01_Intro } from './scenes/S01_Intro'
import { S02_Dashboard } from './scenes/S02_Dashboard'
import { S03_MultiAccount } from './scenes/S03_MultiAccount'
import { S04_Transactions } from './scenes/S04_Transactions'
import { S05_BulkImport } from './scenes/S05_BulkImport'
import { S06_Investment } from './scenes/S06_Investment'
import { S07_AIChat } from './scenes/S07_AIChat'
import { S08_MobileShowcase } from './scenes/S08_MobileShowcase'
import { S09_Encryption } from './scenes/S09_Encryption'
import { S10_Closing } from './scenes/S10_Closing'

export const Video: React.FC = () => {
  const frame = useCurrentFrame()
  const totalFrames = 1515
  const musicVolume = interpolate(frame, [0, 20, totalFrames - 90, totalFrames], [0, 0.6, 0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ backgroundColor: '#12161c' }}>
      <Audio src={staticFile('music.mp3')} volume={musicVolume} />
      <Sequence from={0} durationInFrames={90}>
        <S01_Intro />
      </Sequence>
      <Sequence from={90} durationInFrames={195}>
        <S02_Dashboard />
      </Sequence>
      <Sequence from={285} durationInFrames={120}>
        <S03_MultiAccount />
      </Sequence>
      <Sequence from={405} durationInFrames={165}>
        <S04_Transactions />
      </Sequence>
      <Sequence from={570} durationInFrames={150}>
        <S05_BulkImport />
      </Sequence>
      <Sequence from={720} durationInFrames={195}>
        <S06_Investment />
      </Sequence>
      <Sequence from={915} durationInFrames={195}>
        <S07_AIChat />
      </Sequence>
      <Sequence from={1110} durationInFrames={165}>
        <S08_MobileShowcase />
      </Sequence>
      <Sequence from={1275} durationInFrames={150}>
        <S09_Encryption />
      </Sequence>
      <Sequence from={1425} durationInFrames={90}>
        <S10_Closing />
      </Sequence>
    </AbsoluteFill>
  )
}
