'use client'

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

const weekdayFormat = new Intl.DateTimeFormat('es-ES', { weekday: 'short' })
const dayMonthFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const fullFormat = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function toDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** The category as one label: "Category / Subcategory", or "Sin categoría" */
function categoryLabel(tx: Transaction): string {
  if (!tx.category_name) return 'Sin categoría'
  return tx.subcategory_name ? `${tx.category_name} / ${tx.subcategory_name}` : tx.category_name
}

/**
 * Transactions as a table: date, concept, category and amount, each in its own column so they
 * line up row after row. The date shows once per day; the rows that follow keep it for screen
 * readers only, and a stronger line marks where a new day starts.
 */
export function TxList({
  transactions,
  selecting = false,
  selectedIds,
  onToggle,
  onEdit,
  onDelete,
  onCategoryClick,
}: TxListProps) {
  const hasActions = !selecting && Boolean(onEdit || onCategoryClick || onDelete)

  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="border-b border-layer-3 text-left text-xs text-text-secondary sm:text-sm">
          {selecting && (
            <th scope="col" className="w-8 py-2">
              <span className="sr-only">Seleccionar</span>
            </th>
          )}
          <th scope="col" className="w-16 py-2 pr-3 font-medium sm:w-32">
            Fecha
          </th>
          <th scope="col" className="py-2 pr-3 font-medium">
            Concepto
          </th>
          <th scope="col" className="hidden py-2 pr-3 font-medium sm:table-cell sm:w-56 lg:w-72">
            Categoría
          </th>
          <th scope="col" className="w-28 py-2 text-right font-medium sm:w-36">
            Importe
          </th>
          {hasActions && (
            <th scope="col" className="w-10 py-2">
              <span className="sr-only">Acciones</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {transactions.map((tx, index) => {
          // The API sends the day as YYYY-MM-DD or as midnight UTC of that day
          const day = tx.date.slice(0, 10)
          const firstOfDay = index === 0 || transactions[index - 1].date.slice(0, 10) !== day
          const date = toDate(day)
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
          const category = (
            <button
              type="button"
              onClick={() => onCategoryClick?.(tx)}
              disabled={!onCategoryClick}
              className="flex max-w-full items-center gap-2 rounded text-left text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:hover:text-text-secondary"
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-layer-3"
                style={tx.category_color ? { backgroundColor: tx.category_color } : undefined}
              />
              <span className="truncate">{categoryLabel(tx)}</span>
            </button>
          )
          return (
            <tr
              key={tx.id}
              className={cn(
                'border-t transition-colors hover:bg-layer-2/60',
                firstOfDay && index > 0 ? 'border-layer-3' : 'border-layer-2',
                index === 0 && 'border-t-0',
                selected && 'bg-accent/5',
                tx._optimistic && 'opacity-60'
              )}
            >
              {selecting && (
                <td className="py-3 align-top">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle?.(tx.id)}
                    aria-label={`Seleccionar ${tx.description}`}
                    className="mt-0.5 h-4 w-4 accent-[hsl(var(--accent))]"
                  />
                </td>
              )}

              <td className="py-3 pr-3 align-top tabular-nums">
                <time dateTime={day} title={fullFormat.format(date)}>
                  {firstOfDay ? (
                    <span className="flex flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-1.5">
                      <span className="text-text-primary">{dayMonthFormat.format(date)}</span>
                      <span className="text-xs text-text-secondary sm:text-sm">
                        {weekdayFormat.format(date)}
                      </span>
                    </span>
                  ) : (
                    <span className="sr-only">{fullFormat.format(date)}</span>
                  )}
                </time>
              </td>

              <td className="py-3 pr-3 align-top">
                <p className="truncate font-medium text-text-primary" title={tx.description}>
                  {tx.description}
                </p>
                {/* On a phone the category goes under the concept */}
                <div className="mt-1 text-xs sm:hidden">{category}</div>
              </td>

              <td className="hidden py-3 pr-3 align-top sm:table-cell">{category}</td>

              <td className="py-3 text-right align-top">
                <Money
                  value={Number(tx.amount)}
                  sign="always"
                  tone="movement"
                  className="font-medium"
                />
              </td>

              {hasActions && (
                <td className="py-1.5 pl-1 text-right align-top">
                  {actions.length > 0 && (
                    <ActionMenu label={`Acciones de ${tx.description}`} items={actions} />
                  )}
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
