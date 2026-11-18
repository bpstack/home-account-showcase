import { cn } from '@/lib/utils'
import { formatMoney, type SignMode } from '@/lib/money'

interface MoneyProps {
  value: number | null | undefined
  sign?: SignMode
  /**
   * auto: green when positive, red when negative (totals, balances)
   * movement: green when positive, ink when negative (a row in a list)
   * neutral: always ink
   */
  tone?: 'auto' | 'movement' | 'neutral'
  className?: string
}

/** An amount, always written the same way (lib/money.ts) and with aligned figures. */
export function Money({ value, sign = 'auto', tone = 'auto', className }: MoneyProps) {
  const n = value ?? 0
  const color =
    value === null || value === undefined
      ? 'text-text-secondary'
      : tone === 'neutral' || n === 0
        ? 'text-text-primary'
        : n > 0
          ? 'text-success'
          : tone === 'movement'
            ? 'text-text-primary'
            : 'text-danger'
  return (
    <span className={cn('whitespace-nowrap tabular-nums', color, className)}>
      {formatMoney(value, sign)}
    </span>
  )
}
