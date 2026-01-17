'use client'

import { ChevronLeft, ChevronRight, Edit2, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import type { Transaction } from '@/lib/apiClient'

export interface ResponsiveTransactionTableProps {
  transactions: Transaction[]
  total: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onCategoryClick?: (transaction: Transaction) => void
  onEdit?: (transaction: Transaction) => void
  onDelete?: (id: string) => void
  isLoading?: boolean
  showSubcategory?: boolean
  emptyMessage?: string
}

export function ResponsiveTransactionTable({
  transactions,
  total,
  page,
  totalPages,
  onPageChange,
  onCategoryClick,
  onEdit,
  onDelete,
  isLoading = false,
  showSubcategory = false,
  emptyMessage = 'No hay transacciones en este periodo',
}: ResponsiveTransactionTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  }

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  }

  const hasActions = onEdit || onDelete

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center gap-2 text-text-secondary">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando transacciones...
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-text-secondary text-center py-8">
        {emptyMessage}
      </p>
    )
  }

  return (
    <>
      {/* Table - Desktop */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-layer-3">
                <th className="text-left py-3 px-2 text-text-secondary font-medium text-xs uppercase tracking-wider">
                  Fecha
                </th>
                <th className="text-left py-3 px-2 text-text-secondary font-medium text-xs uppercase tracking-wider">
                  Descripcion
                </th>
                <th className="text-left py-3 px-2 text-text-secondary font-medium text-xs uppercase tracking-wider">
                  Categoria
                </th>
                <th className="text-right py-3 px-2 text-text-secondary font-medium text-xs uppercase tracking-wider">
                  Importe
                </th>
                {hasActions && (
                  <th className="text-right py-3 px-2 text-text-secondary font-medium text-xs uppercase tracking-wider w-24">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-layer-2 hover:bg-layer-2/50 transition-colors">
                  <td className="py-3 px-2 text-text-secondary text-sm">{formatDate(tx.date)}</td>
                  <td className="py-3 px-2 text-text-primary font-medium text-sm">{tx.description}</td>
                  <td className="py-3 px-2">
                    <button
                      onClick={() => onCategoryClick?.(tx)}
                      className="text-left hover:bg-layer-2 rounded px-1.5 py-1 -mx-1.5 -my-1 transition-colors"
                      title="Haz clic para cambiar la categoria"
                    >
                      {tx.category_name ? (
                        <div className="flex items-start gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                            style={{ backgroundColor: tx.category_color || '#6b7280' }}
                          />
                          <div className="min-w-0">
                            <span
                              className="text-sm block"
                              style={{ color: tx.category_color || '#6b7280' }}
                            >
                              {tx.category_name}
                            </span>
                            {showSubcategory && tx.subcategory_name && (
                              <span className="text-xs block text-text-secondary">
                                {tx.subcategory_name}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-text-secondary">Sin categoria</span>
                      )}
                    </button>
                  </td>
                  <td
                    className={`py-3 px-2 text-right font-semibold text-sm ${
                      Number(tx.amount) >= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {Number(tx.amount) >= 0 ? '+' : ''}
                    {formatCurrency(Number(tx.amount))}
                  </td>
                  {hasActions && (
                    <td className="py-3 px-2 text-right">
                      <div className="flex justify-end gap-1">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(tx)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-danger hover:text-danger"
                            onClick={() => onDelete(tx.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-2">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="bg-layer-1 rounded-lg border border-layer-3 p-3 hover:shadow-md transition-shadow"
          >
            {/* Header: Descripcion + Importe */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-sm font-medium text-text-primary flex-1 min-w-0 line-clamp-2">
                {tx.description}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={`text-sm font-semibold ${
                    Number(tx.amount) >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {Number(tx.amount) >= 0 ? '+' : ''}
                  {formatCurrency(Number(tx.amount))}
                </span>
                {hasActions && (
                  <div className="flex gap-0.5 ml-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEdit(tx)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-danger hover:text-danger"
                        onClick={() => onDelete(tx.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer: Fecha + Categoria */}
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>{formatDateShort(tx.date)}</span>
              <span>·</span>
              <button
                onClick={() => onCategoryClick?.(tx)}
                className="hover:underline transition-all"
                style={{ color: tx.category_color || '#6b7280' }}
              >
                {tx.category_name || 'Sin categoria'}
              </button>
              {showSubcategory && tx.subcategory_name && (
                <>
                  <span>·</span>
                  <span style={{ color: tx.category_color ? `${tx.category_color}99` : '#9ca3af' }}>
                    {tx.subcategory_name}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center gap-2 mt-4">
        <span className="text-xs text-text-secondary">
          Mostrando {transactions.length} de {total} transacciones
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-text-secondary px-2">
              Pagina {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
