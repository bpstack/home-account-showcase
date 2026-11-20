import { useCurrentFrame, useVideoConfig } from 'remotion'
import { enter } from '../design/motion'
import { Caption } from '../components/kit/Caption'
import { Cursor } from '../components/kit/Cursor'
import { Scene } from '../components/kit/Stage'
import { AccountFigures, AccountSwitcher } from '../components/screens/AccountsPanel'

export const ACCOUNT_SWITCHES = [42, 80]
export const activeAccount = (frame: number) => (frame < ACCOUNT_SWITCHES[0] ? 1 : frame < ACCOUNT_SWITCHES[1] ? 0 : 2)

/** Where each account row sits inside the switcher (virtual px), for the cursor. */
export const accountRowY = (i: number) => 106 + i * 48

export const S03_MultiAccount: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const active = activeAccount(frame)
  const panel = enter(frame, fps, 10)
  const s = 1.45

  return (
    <Scene duration={120} glowY="30%">
      <Caption
        eyebrow="Multi-cuenta"
        icon="users"
        title="Un login, varias cuentas"
        description="Comparte una cuenta con tu familia y cambia entre ellas al instante."
        style={{ position: 'absolute', top: 96, left: 0, right: 0 }}
      />
      <div
        style={{
          position: 'absolute',
          top: 380,
          left: '50%',
          width: 1060,
          marginLeft: -530 * s,
          transform: `scale(${s}) translateY(${(1 - panel) * 30}px)`,
          transformOrigin: 'top left',
          opacity: panel,
          display: 'flex',
          alignItems: 'center',
          gap: 80,
        }}
      >
        <div style={{ position: 'relative' }}>
          <AccountSwitcher active={active} />
          <Cursor
            frame={frame}
            appear={24}
            keys={[
              { frame: 24, x: 300, y: 240 },
              { frame: 38, x: 150, y: accountRowY(0) },
              { frame: 66, x: 150, y: accountRowY(0) },
              { frame: 76, x: 160, y: accountRowY(2) },
            ]}
            clicks={[ACCOUNT_SWITCHES[0] - 2, ACCOUNT_SWITCHES[1] - 2]}
            size={20}
          />
        </div>
        <div style={{ flex: 1 }}>
          <AccountFigures active={active} switches={[0, ...ACCOUNT_SWITCHES]} />
        </div>
      </div>
    </Scene>
  )
}
