import { useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS } from '../design/theme'
import { enter } from '../design/motion'
import { Caption } from '../components/kit/Caption'
import { Scene } from '../components/kit/Stage'
import { Padlock, RecoveryPhrase, SecurityBadges } from '../components/screens/Security'

export const S09_Encryption: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const note = enter(frame, fps, 56)
  return (
    <Scene duration={150} glowX="30%" glowY="55%">
      <Caption
        eyebrow="Seguridad"
        icon="shield"
        title="Cifrado de extremo a extremo"
        description="Tus datos se cifran en tu dispositivo: el servidor solo guarda lo que no puede leer."
        style={{ position: 'absolute', top: 64, left: 0, right: 0 }}
      />
      <div
        style={{
          position: 'absolute',
          top: 340,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 160,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 56 }}>
          <Padlock size={220} closeAt={22} />
          <SecurityBadges start={44} size={20} />
          <div style={{ fontSize: 18, color: COLORS.textSecondary, opacity: note, maxWidth: 520, textAlign: 'center', lineHeight: 1.45 }}>
            Tu clave sale de tu contraseña y nunca viaja al servidor.
          </div>
        </div>
        <RecoveryPhrase start={60} scale={1.3} />
      </div>
    </Scene>
  )
}
