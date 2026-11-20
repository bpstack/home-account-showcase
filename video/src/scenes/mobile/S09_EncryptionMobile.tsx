import { MobileCaption } from '../../components/kit/PhoneStage'
import { Scene } from '../../components/kit/Stage'
import { Padlock, RecoveryPhrase, SecurityBadges } from '../../components/screens/Security'

export const S09_EncryptionMobile: React.FC = () => (
  <Scene duration={150} glowY="30%">
    <MobileCaption
      eyebrow="Seguridad"
      icon="shield"
      title="Cifrado de extremo a extremo"
      description="Tus datos se cifran en tu dispositivo: el servidor solo guarda lo que no puede leer."
      top={140}
    />
    <div style={{ position: 'absolute', top: 640, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 64 }}>
      <Padlock size={240} closeAt={22} />
      <SecurityBadges start={44} size={28} />
      <RecoveryPhrase start={60} scale={2} />
    </div>
  </Scene>
)
