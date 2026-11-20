import { Scene } from '../../components/kit/Stage'
import { ClosingContent } from '../S10_Closing'

export const S10_ClosingMobile: React.FC = () => (
  <Scene duration={90} glowY="40%" glow={1.4}>
    <ClosingContent size={1.45} columns={1} />
  </Scene>
)
