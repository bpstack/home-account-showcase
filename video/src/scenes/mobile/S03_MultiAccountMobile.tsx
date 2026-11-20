import { useCurrentFrame, useVideoConfig } from 'remotion'
import { enter } from '../../design/motion'
import { Cursor } from '../../components/kit/Cursor'
import { MobileCaption } from '../../components/kit/PhoneStage'
import { Scene } from '../../components/kit/Stage'
import { AccountFigures, AccountSwitcher } from '../../components/screens/AccountsPanel'
import { ACCOUNT_SWITCHES, accountRowY, activeAccount } from '../S03_MultiAccount'

export const S03_MultiAccountMobile: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const active = activeAccount(frame)
  const panel = enter(frame, fps, 10)
  const s = 2.2
  const w = 420

  return (
    <Scene duration={120} glowY="35%">
      <MobileCaption
        eyebrow="Multi-cuenta"
        icon="users"
        title="Un login, varias cuentas"
        description="Comparte una cuenta con tu familia y cambia entre ellas al instante."
        top={180}
      />
      <div
        style={{
          position: 'absolute',
          top: 720,
          left: (1080 - w * s) / 2,
          width: w,
          transform: `scale(${s}) translateY(${(1 - panel) * 30}px)`,
          transformOrigin: 'top left',
          opacity: panel,
          display: 'flex',
          flexDirection: 'column',
          gap: 56,
        }}
      >
        <div style={{ position: 'relative' }}>
          <AccountSwitcher active={active} width={w} />
          <Cursor
            frame={frame}
            appear={24}
            keys={[
              { frame: 24, x: 330, y: 260 },
              { frame: 38, x: 170, y: accountRowY(0) },
              { frame: 66, x: 170, y: accountRowY(0) },
              { frame: 76, x: 180, y: accountRowY(2) },
            ]}
            clicks={[ACCOUNT_SWITCHES[0] - 2, ACCOUNT_SWITCHES[1] - 2]}
            size={16}
          />
        </div>
        <AccountFigures active={active} switches={[0, ...ACCOUNT_SWITCHES]} compact />
      </div>
    </Scene>
  )
}
