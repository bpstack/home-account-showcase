'use client'

import { useMemo } from 'react'
import { Pencil, Tag, Trash2 } from 'lucide-react'
import { ActionMenu, Money } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/lib/apiClient'

type Row = Transaction & { _optimistic?: boolean }

interface TxListProps {
  transactions: Row[]
  /** Checkboxes are shown only while selecting */
  selecting?: boolean
  selectedIds?: Set<string>
  onToggle?: (_id: string) => void
  onEdit?: (_tx: Transaction) => void
  onDelete?: (_id: string) => void
  onCategoryClick?: (_tx: Transaction) => void
}

const dayFormat = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/**
 * The local calendar day of a movement as YYYY-MM-DD. The API sends either "2026-02-13" or a
 * timestamp like "2026-02-12T23:00:00.000Z" (local midnight in UTC): cutting the string would
 * give the day before in Spain, so a timestamp is read as a Date in local time.
 */
function localDayKey(value: string): string {
  if (value.length <= 10) return value
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dayLabel(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const text = dayFormat.format(new Date(y, m - 1, d))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Movements grouped by day; each row: concept, category, amount and a "⋯" menu. */
export function TxList({
  transactions,
  selecting = false,
  selectedIds,
  onToggle,
  onEdit,
  onDelete,
  onCategoryClick,
}: TxListProps) {
  const days = useMemo(() => {
    const groups = new Map<string, Row[]>()
    for (const tx of transactions) {
      const day = localDayKey(tx.date)
      const list = groups.get(day)
      if (list) list.push(tx)
      else groups.set(day, [tx])
    }
    return [...groups.entries()]
  }, [transactions])

  return (
    <div className="space-y-6">
      {days.map(([day, rows]) => (
        <section key={day} aria-label={dayLabel(day)}>
          <h3 className="pb-2 text-xs font-medium text-text-secondary sm:text-sm">
            {dayLabel(day)}
          </h3>
          <ul className="divide-y divide-layer-3 border-y border-layer-3">
            {rows.map((tx) => {
              const selected = selectedIds?.has(tx.id) ?? false
              const actions = [
                ...(onEdit
                  ? [
                      {
                        label: 'Editar',
                        icon: <Pencil className="h-4 w-4" aria-hidden="true" />,
                        onSelect: () => onEdit(tx),
                      },
                    ]
                  : []),
                ...(onCategoryClick
                  ? [
                      {
                        label: 'Cambiar categoría',
                        icon: <Tag className="h-4 w-4" aria-hidden="true" />,
                        onSelect: () => onCategoryClick(tx),
                      },
                    ]
                  : []),
                ...(onDelete
                  ? [
                      {
                        label: 'Eliminar',
                        icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                        onSelect: () => onDelete(tx.id),
                        danger: true,
                      },
                    ]
                  : []),
              ]
              return (
                <li
                  key={tx.id}
                  className={cn(
                    'flex min-h-14 items-center gap-3 py-2',
                    selected && 'bg-accent/5',
                    tx._optimistic && 'opacity-60'
                  )}
                >
                  {selecting && (
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggle?.(tx.id)}
                      aria-label={`Seleccionar ${tx.description}`}
                      className="h-4 w-4 flex-shrink-0 accent-[hsl(var(--accent))]"
                    />
                  )}

                  <div className="min-w-0 flex-1 sm:grid sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center sm:gap-6">
                    <p className="truncate text-sm text-text-primary">{tx.description}</p>
                    <button
                      type="button"
                      onClick={() => onCategoryClick?.(tx)}
                      disabled={!onCategoryClick}
                      className="mt-0.5 flex max-w-full items-center gap-1.5 rounded text-xs text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:hover:text-text-secondary sm:mt-0 sm:text-sm"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 flex-shrink-0 rounded-full bg-layer-3"
                        style={
                          tx.category_color ? { backgroundColor: tx.category_color } : undefined
                        }
                      />
                      <span className="truncate">
                        {tx.category_name
                          ? tx.subcategory_name
                            ? `${tx.category_name} / ${tx.subcategory_name}`
                            : tx.category_name
                          : 'Sin categoría'}
                      </span>
                    </button>
                  </div>

                  <Money
                    value={Number(tx.amount)}
                    sign="always"
                    tone="movement"
                    className="text-sm font-medium"
                  />

                  {!selecting && actions.length > 0 && (
                    <ActionMenu label={`Acciones de ${tx.description}`} items={actions} />
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
