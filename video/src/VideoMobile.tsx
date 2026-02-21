import { AbsoluteFill, Audio, Sequence, staticFile, interpolate, useCurrentFrame } from 'remotion'
import { S01_Intro } from './scenes/S01_Intro'
import { S02_DashboardMobile } from './scenes/mobile/S02_DashboardMobile'
import { S03_MultiAccountMobile } from './scenes/mobile/S03_MultiAccountMobile'
import { S04_TransactionsMobile } from './scenes/mobile/S04_TransactionsMobile'
import { S05_BulkImportMobile } from './scenes/mobile/S05_BulkImportMobile'
import { S06_InvestmentMobile } from './scenes/mobile/S06_InvestmentMobile'
import { S07_AIChatMobile } from './scenes/mobile/S07_AIChatMobile'
import { S08_MobileShowcaseMobile } from './scenes/mobile/S08_MobileShowcaseMobile'
import { S09_EncryptionMobile } from './scenes/mobile/S09_EncryptionMobile'
import { S10_Closing } from './scenes/S10_Closing'

export const VideoMobile: React.FC = () => {
  const frame = useCurrentFrame()
  const totalFrames = 1515
  const musicVolume = interpolate(frame, [0, 20, totalFrames - 90, totalFrames], [0, 0.6, 0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ backgroundColor: '#09090b' }}>
      <Audio src={staticFile('music.mp3')} volume={musicVolume} />
      <Sequence from={0} durationInFrames={90}>
        <S01_Intro />
      </Sequence>
      <Sequence from={90} durationInFrames={195}>
        <S02_DashboardMobile />
      </Sequence>
      <Sequence from={285} durationInFrames={120}>
        <S03_MultiAccountMobile />
      </Sequence>
      <Sequence from={405} durationInFrames={165}>
        <S04_TransactionsMobile />
      </Sequence>
      <Sequence from={570} durationInFrames={150}>
        <S05_BulkImportMobile />
      </Sequence>
      <Sequence from={720} durationInFrames={195}>
        <S06_InvestmentMobile />
      </Sequence>
      <Sequence from={915} durationInFrames={195}>
        <S07_AIChatMobile />
      </Sequence>
      <Sequence from={1110} durationInFrames={165}>
        <S08_MobileShowcaseMobile />
      </Sequence>
      <Sequence from={1275} durationInFrames={150}>
        <S09_EncryptionMobile />
      </Sequence>
      <Sequence from={1425} durationInFrames={90}>
        <S10_Closing />
      </Sequence>
    </AbsoluteFill>
  )
}
