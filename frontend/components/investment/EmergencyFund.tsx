'use client'

import { useCallback, useId, useState } from 'react'
import { toast } from 'sonner'
import { Button, Input, Money, Select, Sheet } from '@/components/ui'
import { useUpdateEmergencyFundMonths, useUpdateLiquidityReserve } from '@/lib/queries/investment'

const MONTH_OPTIONS = [3, 6, 9, 12, 18, 24, 36, 48, 60].map((n) => ({
  value: String(n),
  label: `${n} meses`,
}))

interface EmergencyFundProps {
  accountId: string
  /** What is set aside today */
  saved: number
  /** How many months of expenses it should cover */
  months: number
  /** Average monthly expenses */
  monthlyExpenses: number
}

/** The cushion for the unexpected: what there is, what it should be, and a way to change both. */
export function EmergencyFund({ accountId, saved, months, monthlyExpenses }: EmergencyFundProps) {
  const [editing, setEditing] = useState(false)
  const close = useCallback(() => setEditing(false), [])
  const goal = monthlyExpenses * months
  const progress = goal > 0 ? Math.min(100, (saved / goal) * 100) : 0

  return (
    <section aria-labelledby="emergency-fund">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="emergency-fund" className="text-sm font-medium text-text-primary">
          Fondo de emergencia
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Editar
        </Button>
      </div>
      <p className="text-sm text-text-secondary">
        <Money value={saved} tone="neutral" className="text-base font-medium" /> de{' '}
        <Money value={goal} tone="neutral" /> ({months} meses de gastos)
      </p>
      <div
        role="progressbar"
        aria-label="Fondo de emergencia completado"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="mt-3 h-2 overflow-hidden rounded-full bg-layer-3"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-text-secondary">{Math.round(progress)} % cubierto</p>

      {editing && (
        <EmergencyFundSheet accountId={accountId} saved={saved} months={months} onClose={close} />
      )}
    </section>
  )
}

function EmergencyFundSheet({
  accountId,
  saved,
  months,
  onClose,
}: {
  accountId: string
  saved: number
  months: number
  onClose: () => void
}) {
  const amountId = useId()
  const monthsId = useId()
  const [amount, setAmount] = useState(String(saved))
  const [goalMonths, setGoalMonths] = useState(String(months))
  const [error, setError] = useState<string | null>(null)
  const updateAmount = useUpdateLiquidityReserve()
  const updateMonths = useUpdateEmergencyFundMonths()
  const isSaving = updateAmount.isPending || updateMonths.isPending

  const save = async () => {
    const value = Number(amount.replace(',', '.'))
    if (!Number.isFinite(value) || value < 0) {
      setError('Escribe una cantidad de 0 o más.')
      return
    }
    try {
      if (value !== saved) await updateAmount.mutateAsync({ accountId, amount: value })
      if (Number(goalMonths) !== months) {
        await updateMonths.mutateAsync({ accountId, months: Number(goalMonths) })
      }
      toast.success('Fondo de emergencia guardado')
      onClose()
    } catch {
      toast.error('No se pudo guardar el fondo de emergencia')
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Fondo de emergencia"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={save} isLoading={isSaving}>
            Guardar
          </Button>
        </>
      }
    >
      <Input
        id={amountId}
        label="Lo que tienes apartado (€)"
        inputMode="decimal"
        value={amount}
        error={error ?? undefined}
        onChange={(e) => {
          setAmount(e.target.value)
          setError(null)
        }}
      />
      <Select
        id={monthsId}
        label="Meses de gastos que debe cubrir"
        options={MONTH_OPTIONS}
        value={goalMonths}
        onChange={(e) => setGoalMonths(e.target.value)}
      />
      <p className="text-sm text-text-secondary">
        Es el dinero para imprevistos: perder el trabajo, una avería, una factura médica. Se suele
        recomendar entre 3 y 6 meses de gastos.
      </p>
    </Sheet>
  )
}
