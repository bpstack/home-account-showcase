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
  // Fade music out in the last 90 frames (3 seconds)
  const musicVolume = interpolate(frame, [0, 30, 3510, 3600], [0, 0.6, 0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ backgroundColor: '#09090b' }}>
      <Audio src={staticFile('music.mp3')} volume={musicVolume} />
      <Sequence from={0} durationInFrames={210}>
        <S01_Intro />
      </Sequence>
      <Sequence from={210} durationInFrames={450}>
        <S02_Dashboard />
      </Sequence>
      <Sequence from={660} durationInFrames={300}>
        <S03_MultiAccount />
      </Sequence>
      <Sequence from={960} durationInFrames={390}>
        <S04_Transactions />
      </Sequence>
      <Sequence from={1350} durationInFrames={360}>
        <S05_BulkImport />
      </Sequence>
      <Sequence from={1710} durationInFrames={450}>
        <S06_Investment />
      </Sequence>
      <Sequence from={2160} durationInFrames={450}>
        <S07_AIChat />
      </Sequence>
      <Sequence from={2610} durationInFrames={390}>
        <S08_MobileShowcase />
      </Sequence>
      <Sequence from={3000} durationInFrames={360}>
        <S09_Encryption />
      </Sequence>
      <Sequence from={3360} durationInFrames={240}>
        <S10_Closing />
      </Sequence>
    </AbsoluteFill>
  )
}
