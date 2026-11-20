import { Composition } from 'remotion'
import { Video } from './Video'
import { VideoMobile } from './VideoMobile'
import { HERO_DESKTOP, HERO_MOBILE, HeroDesktop, HeroMobile } from './stills/Hero'
import './global.css'
import './design/fonts'

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
      <Composition
        id="HeroDesktop"
        component={HeroDesktop}
        durationInFrames={1}
        fps={30}
        width={HERO_DESKTOP.width}
        height={HERO_DESKTOP.height}
      />
      <Composition
        id="HeroMobile"
        component={HeroMobile}
        durationInFrames={1}
        fps={30}
        width={HERO_MOBILE.width}
        height={HERO_MOBILE.height}
      />
    </>
  )
}
