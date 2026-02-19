'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal, ModalFooter, Button, Select } from '@/components/ui'
import { useCategories } from '@/lib/queries/categories'
import { useBulkUpdateByIds } from '@/lib/queries/transactions'
import { AlertTriangle, Loader2, Tag } from 'lucide-react'
import type { CategoryChangeModalProps } from './types'

export function CategoryChangeModal({
  isOpen,
  onClose,
  transaction,
  accountId,
  allTransactions = [],
  onSuccess,
}: CategoryChangeModalProps) {
  const queryClient = useQueryClient()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
  const [applyToAll, setApplyToAll] = useState(false)
  const [saveMapping, setSaveMapping] = useState(false)

  const { data: categoriesData } = useCategories(accountId)
  const categories = useMemo(() => categoriesData?.categories || [], [categoriesData])

  // Client-side: find all transactions with matching description (decrypted)
  const matchingTransactionIds = useMemo(() => {
    if (!transaction || !applyToAll) return []
    const pattern = transaction.description.toLowerCase()
    return allTransactions.filter((t) => t.description.toLowerCase() === pattern).map((t) => t.id)
  }, [transaction, applyToAll, allTransactions])

  const affectedCount = applyToAll ? matchingTransactionIds.length : 1

  const bulkUpdateMutation = useBulkUpdateByIds()

  // Resetear estado cuando cambia la transaccion
  useEffect(() => {
    if (transaction) {
      setSelectedSubcategoryId(transaction.subcategory_id)
      setApplyToAll(false)
      setSaveMapping(false)

      // Encontrar la categoria de la subcategoria actual
      if (transaction.subcategory_id) {
        const category = categories.find((c) =>
          c.subcategories?.some((s) => s.id === transaction.subcategory_id)
        )
        setSelectedCategoryId(category?.id || '')
      } else {
        setSelectedCategoryId('')
      }
    }
  }, [transaction, categories])

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)
  const subcategories = selectedCategory?.subcategories || []

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    setSelectedSubcategoryId(null) // Reset subcategory when category changes
  }

  const handleSave = async () => {
    if (!transaction || !accountId) return

    try {
      const idsToUpdate =
        applyToAll && matchingTransactionIds.length > 0 ? matchingTransactionIds : [transaction.id]

      await bulkUpdateMutation.mutateAsync({
        account_id: accountId,
        transaction_ids: idsToUpdate,
        subcategory_id: selectedSubcategoryId,
      })

      queryClient.invalidateQueries({ queryKey: ['transactions'] })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error al actualizar categoria:', error)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cambiar categoría" size="lg">
      {transaction && (
        <div className="space-y-5">
          {/* Transacción seleccionada */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl border border-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Transacción seleccionada</p>
              <p className="text-sm font-medium text-foreground truncate">
                {transaction.description}
              </p>
            </div>
          </div>

          {/* Selectores de categoría */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Categoría</label>
              <Select
                options={[
                  { value: '', label: 'Sin categoría' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={selectedCategoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
              />
            </div>

            {selectedCategoryId && subcategories.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Subcategoría</label>
                <Select
                  options={[
                    { value: '', label: 'Seleccionar subcategoría...' },
                    ...subcategories.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                  value={selectedSubcategoryId || ''}
                  onChange={(e) => setSelectedSubcategoryId(e.target.value || null)}
                />
              </div>
            )}
          </div>

          {/* Opciones de bulk update */}
          <div className="space-y-3 border-t border-border pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Aplicar a todas las transacciones similares
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cambiará la categoría de todas las transacciones con descripción similar
                </p>
              </div>
            </label>

            {applyToAll && (
              <div className="ml-7 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  Se actualizarán <strong>{affectedCount}</strong> transacciones
                </span>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={saveMapping}
                onChange={(e) => setSaveMapping(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Recordar para futuras importaciones
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Las próximas transacciones con esta descripción se categorizarán automáticamente
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={bulkUpdateMutation.isPending}>
          {bulkUpdateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : applyToAll ? (
            `Actualizar ${affectedCount} transacciones`
          ) : (
            'Guardar'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
