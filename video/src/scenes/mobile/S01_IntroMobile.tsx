import { Scene } from '../../components/kit/Stage'
import { IntroContent } from '../S01_Intro'

export const S01_IntroMobile: React.FC = () => (
  <Scene duration={90} glowY="45%" glow={1.6}>
    <IntroContent size={1.35} stackBadges />
  </Scene>
)
