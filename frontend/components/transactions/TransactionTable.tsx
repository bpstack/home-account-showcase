'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'
import type { TransactionTableProps } from './types'

export function TransactionTable({
  transactions,
  total,
  page,
  totalPages,
  onPageChange,
  onCategoryClick,
}: TransactionTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  }

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-text-secondary text-center py-8">
        No hay transacciones en este periodo
      </p>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-layer-3">
              <th className="text-left py-3 px-2 text-text-secondary font-medium">Fecha</th>
              <th className="text-left py-3 px-2 text-text-secondary font-medium">Descripcion</th>
              <th className="text-left py-3 px-2 text-text-secondary font-medium">Categoria</th>
              <th className="text-right py-3 px-2 text-text-secondary font-medium">Importe</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-layer-2 hover:bg-layer-2/50">
                <td className="py-3 px-2 text-text-secondary">{formatDate(tx.date)}</td>
                <td className="py-3 px-2 text-text-primary font-medium">{tx.description}</td>
                <td className="py-3 px-2">
                  <button
                    onClick={() => onCategoryClick?.(tx)}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all"
                    style={{
                      backgroundColor: tx.category_color ? `${tx.category_color}20` : '#f3f4f6',
                      color: tx.category_color || '#6b7280',
                    }}
                    title="Haz clic para cambiar la categoria"
                  >
                    {tx.category_name || 'Sin categoria'}
                  </button>
                </td>
                <td
                  className={`py-3 px-2 text-right font-medium ${
                    Number(tx.amount) >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {Number(tx.amount) >= 0 ? '+' : ''}
                  {formatCurrency(Number(tx.amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
