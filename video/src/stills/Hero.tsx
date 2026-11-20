import { AbsoluteFill } from 'remotion'
import { COLORS } from '../design/theme'
import { AppWindow, WINDOW } from '../components/kit/AppWindow'
import { Phone, PHONE } from '../components/kit/Phone'
import { OverviewScreen } from '../components/screens/OverviewScreen'

// The two screenshots of the home page's hero (frontend/public/hero-*.png), drawn from the same
// pieces as the video. Same sizes as the files they replace, so the landing frames them unchanged.
export const HERO_DESKTOP = { width: 2050, height: 1081 } as const
export const HERO_MOBILE = { width: 356, height: 737 } as const

// Everything already in its final state: no entrance left to play on a still
const SETTLED = -200

export const HeroDesktop: React.FC = () => {
  const scale = HERO_DESKTOP.width / WINDOW.width
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <AppWindow
        url=""
        active="Resumen"
        title="Resumen"
        scale={scale}
        chrome={false}
        height={HERO_DESKTOP.height / scale}
        padded={false}
      >
        <OverviewScreen start={SETTLED} />
      </AppWindow>
    </AbsoluteFill>
  )
}

export const HeroMobile: React.FC = () => {
  const scale = HERO_MOBILE.width / PHONE.width
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Phone title="Resumen" active="Resumen" scale={scale} bare height={Math.ceil(HERO_MOBILE.height / scale)}>
        <OverviewScreen start={SETTLED} compact />
      </Phone>
    </AbsoluteFill>
  )
}
