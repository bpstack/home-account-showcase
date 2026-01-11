import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface MonthlyData {
  month: string
  income: number
  expenses: number
  [key: string]: string | number
}

interface Props {
  data: MonthlyData[]
}

export function MonthlyBarChart({ data }: Props) {
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
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
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
        <Bar dataKey="income" name="Ingresos" fill="#22C55E" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
