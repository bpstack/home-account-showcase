import { Caption } from '../components/kit/Caption'
import { Scene, WindowStage } from '../components/kit/Stage'
import { OverviewScreen } from '../components/screens/OverviewScreen'

export const S02_Dashboard: React.FC = () => (
  <Scene duration={195}>
    <Caption
      eyebrow="Resumen"
      icon="dashboard"
      title="Lo que entra, lo que sale y lo que queda"
      style={{ position: 'absolute', top: 40, left: 0, right: 0 }}
    />
    <WindowStage
      url="homeaccount.app/dashboard"
      active="Resumen"
      title="Resumen"
      padded={false}
      content={<OverviewScreen start={16} />}
    />
  </Scene>
)
