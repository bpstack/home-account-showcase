import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface BalanceData {
  date: string
  balance: number
  [key: string]: string | number
}

interface Props {
  data: BalanceData[]
  year?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null

  const formatValue = (value: number | undefined) => {
    if (value === undefined) return '-'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(Math.abs(value))
  }

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm text-muted-foreground">
          {entry.name} : {formatValue(entry.value)}
        </p>
      ))}
    </div>
  )
}

export function BalanceLineChart({ data, year }: Props) {
  const formatYAxis = (value: number) => {
    return (value / 1000).toFixed(1)
  }

  const chartTitle = year ? `Evolución del balance - ${year}` : 'Evolución del balance'

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const minWidth = isMobile ? Math.max(data.length * 60, 400) : '100%'

  return (
    <div className="w-full">
      <h3 className="text-sm font-medium text-text-secondary mb-4">{chartTitle}</h3>
      <div className="w-full overflow-x-auto">
        <ResponsiveContainer width={minWidth} height={300}>
          <LineChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
            <YAxis tickFormatter={formatYAxis} stroke="#9CA3AF" fontSize={12} width={40} />
            <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="balance"
              name="Balance"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs">
        <span className="text-muted-foreground">Datos en miles de €</span>
      </div>
    </div>
  )
}
