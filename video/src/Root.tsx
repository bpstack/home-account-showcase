import { Composition } from 'remotion'
import { Video } from './Video'
import { VideoMobile } from './VideoMobile'
import './global.css'

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="HomeAccountPromo"
        component={Video}
        durationInFrames={1515}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="HomeAccountPromoMobile"
        component={VideoMobile}
        durationInFrames={1515}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  )
}
