'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Edit2, Trash2, Loader2, Clock, CheckSquare, Square, Trash, Tag } from 'lucide-react'
import { Button, Select } from '@/components/ui'
import type { Transaction } from '@/lib/apiClient'

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export type TransactionWithOptimistic = Transaction & {
  _optimistic?: boolean
}

export interface ResponsiveTransactionTableProps {
  transactions: TransactionWithOptimistic[]
  total: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onCategoryClick?: (transaction: Transaction) => void
  onEdit?: (transaction: Transaction) => void
  onDelete?: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
  onBulkCategoryChange?: (ids: string[], categoryId: string, subcategoryId?: string) => void
  categories?: any[]
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
  onBulkDelete,
  onBulkCategoryChange,
  categories = [],
  isLoading = false,
  showSubcategory = false,
  emptyMessage = 'No hay transacciones en este periodo',
}: ResponsiveTransactionTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState('')
  const [bulkSubcategoryId, setBulkSubcategoryId] = useState('')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const day = date.getDate()
    const month = MONTHS_ES[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  }

  const hasActions = onEdit || onDelete || onBulkDelete || onBulkCategoryChange
  const hasBulkActions = onBulkDelete || onBulkCategoryChange

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transactions.map(tx => tx.id)))
    }
  }, [transactions, selectedIds])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const handleBulkDelete = useCallback(() => {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }, [onBulkDelete, selectedIds])

  const handleBulkCategoryChange = useCallback(() => {
    if (onBulkCategoryChange && selectedIds.size > 0 && bulkCategoryId) {
      onBulkCategoryChange(Array.from(selectedIds), bulkCategoryId, bulkSubcategoryId || undefined)
      setSelectedIds(new Set())
      setBulkCategoryId('')
      setBulkSubcategoryId('')
    }
  }, [onBulkCategoryChange, selectedIds, bulkCategoryId, bulkSubcategoryId])

  const categoryOptions = [
    { value: '', label: 'Nueva categoría...' },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
  ]

  const subcategoryOptions = (() => {
    if (!bulkCategoryId) return [{ value: '', label: 'Subcategoría...' }]
    const category = categories.find((c) => c.id === bulkCategoryId)
    if (!category?.subcategories) return [{ value: '', label: 'Sin subcategorías' }]
    return [
      { value: '', label: 'Subcategoría...' },
      ...category.subcategories.map((sub: any) => ({ value: sub.id, label: sub.name })),
    ]
  })()

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center gap-2 text-text-secondary">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando transacciones...
      </div>
    )
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-text-secondary text-center py-8">{emptyMessage}</p>
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      {hasBulkActions && selectedIds.size > 0 && (
        <div className="bg-accent/10 border border-accent/20 rounded-md p-3 mb-4">
          {/* Select All Button - Mobile */}
          <div className="md:hidden mb-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
            >
              {selectedIds.size === transactions.length ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Deseleccionar todas ({selectedIds.size})
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  Seleccionar todas ({transactions.length})
                </>
              )}
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-accent shrink-0">
              {selectedIds.size} transacción{selectedIds.size > 1 ? 'es' : ''} seleccionada{selectedIds.size > 1 ? 's' : ''}
            </span>
            
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {onBulkCategoryChange && (
                <>
                  <div className="w-full sm:w-auto flex gap-2">
                    <Select
                      options={categoryOptions}
                      value={bulkCategoryId}
                      onChange={(e) => {
                        setBulkCategoryId(e.target.value)
                        setBulkSubcategoryId('')
                      }}
                      className="flex-1 sm:w-40 h-8 text-xs min-w-[120px]"
                    />
                    {bulkCategoryId && (
                      <Select
                        options={subcategoryOptions}
                        value={bulkSubcategoryId}
                        onChange={(e) => setBulkSubcategoryId(e.target.value)}
                        className="flex-1 sm:w-40 h-8 text-xs min-w-[120px]"
                      />
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleBulkCategoryChange}
                    disabled={!bulkCategoryId}
                    className="h-8 shrink-0"
                  >
                    <Tag className="h-3.5 w-3.5 mr-1" />
                    Cambiar
                  </Button>
                </>
              )}
              
              {onBulkDelete && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleBulkDelete}
                  className="h-8 shrink-0"
                >
                  <Trash className="h-3.5 w-3.5 mr-1" />
                  Eliminar
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="h-8 shrink-0"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table - Desktop */}
      <div className="hidden md:block bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-800">
              <tr>
                {hasBulkActions && (
                  <th className="px-3 py-2 text-center w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="inline-flex items-center justify-center"
                    >
                      {selectedIds.size === transactions.length ? (
                        <CheckSquare className="h-4 w-4 text-accent" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Descripcion
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Importe
                </th>
                {hasActions && (
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className={`hover:bg-gray-50 dark:hover:bg-[#0d1117] transition-colors ${
                    tx._optimistic ? 'bg-accent/5 animate-pulse' : ''
                  } ${selectedIds.has(tx.id) ? 'bg-accent/5' : ''}`}
                >
                  {hasBulkActions && (
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => toggleSelect(tx.id)}
                        className="inline-flex items-center justify-center"
                      >
                        {selectedIds.has(tx.id) ? (
                          <CheckSquare className="h-4 w-4 text-accent" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                    {tx._optimistic && <Clock className="h-3.5 w-3.5 inline-block mr-1 text-accent" />}
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-medium ${tx._optimistic ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {tx.description}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onCategoryClick?.(tx)}
                      className="text-left"
                      title="Haz clic para cambiar la categoria"
                    >
                      {tx.category_name ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: tx.category_color || '#6b7280' }}
                          />
                          <span
                            className="text-xs capitalize"
                            style={{ color: tx.category_color || '#6b7280' }}
                          >
                            {tx.category_name}
                          </span>
                          {showSubcategory && tx.subcategory_name && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              / {tx.subcategory_name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Sin categoria</span>
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                      <span className="text-text-secondary text-xs">
                        {Number(tx.amount) >= 0 ? '+' : '-'}
                      </span>
                      <span className={`${Number(tx.amount) >= 0 ? 'text-success' : 'text-danger'} ml-1 text-sm`}>
                        {new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(Number(tx.amount)))}
                      </span>
                      <span className="text-text-secondary text-xs ml-1">€</span>
                    </td>
                  {hasActions && (
                    <td className="px-3 py-2 text-right">
                      {tx._optimistic ? (
                        <span className="text-xs text-accent">Guardando...</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(tx)}
                              className="inline-flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(tx.id)}
                              className="inline-flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
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
        {/* Mobile Header with Select All - only shown when in bulk mode */}
        {hasBulkActions && (
          <div className="flex items-center justify-between bg-accent/5 rounded-md px-3 py-2">
            <span className="text-xs font-medium text-accent">
              {selectedIds.size} de {transactions.length} seleccionadas
            </span>
            <button
              onClick={toggleSelectAll}
              className="text-xs text-accent hover:text-accent/80 flex items-center gap-1"
            >
              {selectedIds.size === transactions.length ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Deseleccionar
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  Todas
                </>
              )}
            </button>
          </div>
        )}
        
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className={`bg-white dark:bg-[#151b23] rounded-md border p-3 transition-all ${
              tx._optimistic ? 'bg-accent/5 animate-pulse' : ''
            } ${selectedIds.has(tx.id) ? 'border-accent bg-accent/5' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}
            `}
          >
            <div className="flex items-start gap-3">
              {hasBulkActions && (
                <button
                  onClick={() => toggleSelect(tx.id)}
                  className="mt-1 inline-flex items-center justify-center shrink-0"
                >
                  {selectedIds.has(tx.id) ? (
                    <CheckSquare className="h-5 w-5 text-accent" />
                  ) : (
                    <Square className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    {tx._optimistic && (
                      <span className="inline-flex items-center gap-1 text-xs text-accent mb-1">
                        <Clock className="h-3 w-3" />
                        Guardando...
                      </span>
                    )}
                    <p className={`text-sm font-medium flex-1 min-w-0 line-clamp-2 ${tx._optimistic ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {tx.description}
                    </p>
                  </div>
                  <span className={`text-sm shrink-0 ml-2 ${tx._optimistic ? 'text-gray-400' : Number(tx.amount) >= 0 ? 'text-success' : 'text-danger'}`}>
                      <span className="text-text-secondary font-normal">{Number(tx.amount) >= 0 ? '+' : '-'}</span>
                      <span className="ml-0.5 text-base">
                        {new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(Number(tx.amount)))}
                      </span>
                      <span className="text-text-secondary text-xs ml-0.5">€</span>
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatDate(tx.date)}</span>
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
                  {hasActions && !tx._optimistic && (
                    <>
                      <span>·</span>
                      <div className="flex gap-0.5">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(tx)}
                            className="inline-flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(tx.id)}
                            className="inline-flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Bulk Actions Floating Bar */}
      {hasBulkActions && selectedIds.size > 0 && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 bg-white dark:bg-[#151b23] border border-accent/30 rounded-lg shadow-lg p-3 z-50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-accent">
              {selectedIds.size} selected
            </span>
            <div className="flex items-center gap-2">
              {onBulkDelete && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleBulkDelete}
                  className="h-9"
                >
                  <Trash className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
              {onBulkCategoryChange && (
                <Button
                  size="sm"
                  onClick={handleBulkCategoryChange}
                  disabled={!bulkCategoryId}
                  className="h-9"
                >
                  <Tag className="h-4 w-4 mr-1" />
                  Category
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="h-9 px-3"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col items-center gap-2 mt-4">
        <span className="text-xs text-gray-500 dark:text-gray-400">
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
            <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
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
