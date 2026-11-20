import { MobileCaption, PhoneStage } from '../../components/kit/PhoneStage'
import { Scene } from '../../components/kit/Stage'
import { OverviewScreen } from '../../components/screens/OverviewScreen'

export const S02_DashboardMobile: React.FC = () => (
  <Scene duration={195} glowY="10%">
    <MobileCaption eyebrow="Resumen" icon="dashboard" title="Lo que entra, lo que sale y lo que queda" />
    <PhoneStage title="Resumen" active="Resumen">
      <OverviewScreen start={16} compact />
    </PhoneStage>
  </Scene>
)
