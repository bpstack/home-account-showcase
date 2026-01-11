import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface BalanceData {
  date: string
  balance: number
  [key: string]: string | number
}

interface Props {
  data: BalanceData[]
}

export function BalanceLineChart({ data }: Props) {
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '-'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(Math.abs(value))
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
        <YAxis
          tickFormatter={(value: number | undefined) => formatCurrency(value)}
          stroke="#9CA3AF"
          fontSize={12}
        />
        <Tooltip
          formatter={(value: number | undefined) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#F9FAFB',
          }}
          labelStyle={{ color: '#F9FAFB' }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="balance"
          name="Balance"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
