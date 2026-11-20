import { MobileCaption, PhoneStage } from '../../components/kit/PhoneStage'
import { Scene } from '../../components/kit/Stage'
import { ImportScreen } from '../../components/screens/ImportScreen'

export const S05_BulkImportMobile: React.FC = () => (
  <Scene duration={150} glowY="10%">
    <MobileCaption eyebrow="Importación" icon="upload" title="El extracto de tu banco, en segundos" />
    <PhoneStage title="Importar" active="Importar">
      <ImportScreen dropAt={42} reviewAt={64} compact />
    </PhoneStage>
  </Scene>
)
