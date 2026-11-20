import { useCurrentFrame } from 'remotion'
import { Cursor } from '../../components/kit/Cursor'
import { MOBILE_STAGE, MobileCaption, PhoneStage } from '../../components/kit/PhoneStage'
import { Scene } from '../../components/kit/Stage'
import { TransactionsScreen } from '../../components/screens/TransactionsScreen'

const FILTER_AT = 100
const s = MOBILE_STAGE.scale
// The filters button, in the phone's own coordinates (measured on a still)
const FILTERS = { x: 352, y: 275 }

export const S04_TransactionsMobile: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <Scene duration={165} glowY="10%">
      <MobileCaption eyebrow="Transacciones" icon="receipt" title="Cada movimiento, en su sitio" />
      <PhoneStage
        title="Transacciones"
        active="Transacciones"
        extra={
          <Cursor
            frame={frame}
            appear={66}
            keys={[
              { frame: 66, x: 220 * s, y: 600 * s },
              { frame: 92, x: FILTERS.x * s, y: FILTERS.y * s },
              { frame: 130, x: FILTERS.x * s, y: FILTERS.y * s },
              { frame: 150, x: 260 * s, y: 520 * s },
            ]}
            clicks={[FILTER_AT - 4]}
            size={40}
          />
        }
      >
        <TransactionsScreen start={12} filterAt={FILTER_AT} compact />
      </PhoneStage>
    </Scene>
  )
}
