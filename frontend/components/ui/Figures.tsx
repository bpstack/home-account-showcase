import { Money } from './Money'

interface FiguresProps {
  income: number
  /** Positive number: what went out */
  expenses: number
  className?: string
}

/** Ingresos · Gastos · Saldo of a period, in one line (three columns on phones too). */
export function Figures({ income, expenses, className }: FiguresProps) {
  const balance = income - expenses
  const items = [
    { label: 'Ingresos', node: <Money value={income} sign="always" /> },
    { label: 'Gastos', node: <Money value={-expenses} /> },
    { label: 'Saldo', node: <Money value={balance} className="font-bold" /> },
  ]
  return (
    <dl className={`grid max-w-3xl grid-cols-3 gap-3 sm:gap-8 ${className ?? ''}`}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-text-secondary sm:text-sm">{item.label}</dt>
          <dd className="mt-1 truncate text-sm font-medium sm:text-xl lg:text-2xl">{item.node}</dd>
        </div>
      ))}
    </dl>
  )
}
