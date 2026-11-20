import { Caption } from '../components/kit/Caption'
import { Scene, WindowStage } from '../components/kit/Stage'
import { ImportScreen } from '../components/screens/ImportScreen'

export const S05_BulkImport: React.FC = () => (
  <Scene duration={150}>
    <Caption
      eyebrow="Importación"
      icon="upload"
      title="El extracto de tu banco, en segundos"
      style={{ position: 'absolute', top: 40, left: 0, right: 0 }}
    />
    <WindowStage
      url="homeaccount.app/import"
      active="Importar"
      title="Importar"
      padded={false}
      content={<ImportScreen dropAt={42} reviewAt={64} />}
    />
  </Scene>
)
