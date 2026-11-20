import { Caption } from '../components/kit/Caption'
import { Scene, WindowStage } from '../components/kit/Stage'
import { InvestmentScreen } from '../components/screens/InvestmentScreen'

export const S06_Investment: React.FC = () => (
  <Scene duration={195}>
    <Caption
      eyebrow="Inversión"
      icon="trendingUp"
      title="Un plan para lo que ahorras cada mes"
      style={{ position: 'absolute', top: 40, left: 0, right: 0 }}
    />
    <WindowStage
      url="homeaccount.app/investment"
      active="Inversión"
      title="Inversión"
      padded={false}
      content={<InvestmentScreen start={14} scrollAt={104} scrollBy={400} />}
    />
  </Scene>
)
