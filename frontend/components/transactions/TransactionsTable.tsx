// components/transactions/TransactionsTable.tsx

'use client'

import { useSearchParams } from 'next/navigation'
import { useFiltersStore } from '@/stores/filtersStore'
import { Button, Card, CardContent } from '@/components/ui'
import { Edit2, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Transaction } from '@/lib/apiClient'

interface TransactionsTableProps {
  transactions: Transaction[]
  isLoading: boolean
  total: number
  limit: number
  page: number
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
  onPageChange: (page: number) => void
  formatDate: (dateStr: string) => string
  handleCategoryClick: (tx: Transaction) => void
}

export function TransactionsTable({
  transactions,
  isLoading,
  total,
  limit,
  page,
  onEdit,
  onDelete,
  onPageChange,
  formatDate,
  handleCategoryClick,
}: TransactionsTableProps) {
  const searchParams = useSearchParams()
  const { selectedMonth } = useFiltersStore()

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]

  const periodLabel = selectedMonth !== null
    ? `${months[selectedMonth]}`
    : ''

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando transacciones...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-layer-3 bg-layer-1">
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Fecha</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">
                    Descripción
                  </th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium hidden md:table-cell">
                    Categoría
                  </th>
                  <th className="text-right py-3 px-4 text-text-secondary font-medium">
                    Importe
                  </th>
                  <th className="text-right py-3 px-4 text-text-secondary font-medium w-24">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-layer-2 hover:bg-layer-1">
                    <td className="py-3 px-4 text-text-primary text-xs">{formatDate(tx.date)}</td>
                    <td className="py-3 px-4 text-text-primary">{tx.description}</td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <button
                        onClick={() => handleCategoryClick(tx)}
                        className="text-left hover:ring-2 hover:ring-accent/50 rounded-lg transition-all p-1 -m-1"
                        title="Clic para cambiar categoria"
                      >
                        {tx.category_name ? (
                          <div>
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${tx.category_color}20`,
                                color: tx.category_color,
                              }}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: tx.category_color }}
                              />
                              {tx.category_name}
                            </span>
                            {tx.subcategory_name && (
                              <div className="text-xs text-text-secondary mt-0.5 ml-2">
                                {tx.subcategory_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-secondary text-xs">Sin categoria</span>
                        )}
                      </button>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-medium ${Number(tx.amount) >= 0 ? 'text-success' : 'text-danger'}`}
                    >
                      {Number(tx.amount) >= 0 ? '+' : ''}
                      {Number(tx.amount).toFixed(2)} €
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(tx)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-danger hover:text-danger"
                          onClick={() => onDelete(tx.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-layer-3 bg-layer-1">
              <span className="text-sm text-text-secondary">
                Mostrando {transactions.length} de {total} transacciones
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page * limit >= total}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {!isLoading && transactions.length === 0 && (
          <div className="py-12 text-center text-text-secondary">
            {periodLabel
              ? `No se encontraron transacciones para ${periodLabel}`
              : 'No se encontraron transacciones'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
