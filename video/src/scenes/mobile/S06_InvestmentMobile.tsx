import { MobileCaption, PhoneStage } from '../../components/kit/PhoneStage'
import { Scene } from '../../components/kit/Stage'
import { InvestmentScreen } from '../../components/screens/InvestmentScreen'

export const S06_InvestmentMobile: React.FC = () => (
  <Scene duration={195} glowY="10%">
    <MobileCaption eyebrow="Inversión" icon="trendingUp" title="Un plan para lo que ahorras cada mes" />
    <PhoneStage title="Inversión" active="Más">
      <InvestmentScreen start={14} compact scrollAt={100} scrollBy={430} />
    </PhoneStage>
  </Scene>
)
