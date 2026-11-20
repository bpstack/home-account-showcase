import { useCurrentFrame } from 'remotion'
import { Caption } from '../components/kit/Caption'
import { Cursor } from '../components/kit/Cursor'
import { DESKTOP_STAGE, Scene, WindowStage } from '../components/kit/Stage'
import { TransactionsScreen } from '../components/screens/TransactionsScreen'

const FILTER_AT = 100
const s = DESKTOP_STAGE.scale

export const S04_Transactions: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <Scene duration={165}>
      <Caption
        eyebrow="Transacciones"
        icon="receipt"
        title="Cada movimiento, en su sitio"
        style={{ position: 'absolute', top: 40, left: 0, right: 0 }}
      />
      <WindowStage
        url="homeaccount.app/transactions"
        active="Transacciones"
        title="Transacciones"
        padded={false}
        content={<TransactionsScreen start={12} filterAt={FILTER_AT} />}
      >
        <Cursor
          frame={frame}
          appear={66}
          keys={[
            { frame: 66, x: 760 * s, y: 560 * s },
            { frame: 92, x: 1040 * s, y: 302 * s },
            { frame: 130, x: 1040 * s, y: 302 * s },
            { frame: 150, x: 940 * s, y: 430 * s },
          ]}
          clicks={[FILTER_AT - 4]}
        />
      </WindowStage>
    </Scene>
  )
}
