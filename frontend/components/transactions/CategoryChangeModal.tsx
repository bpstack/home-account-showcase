'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal, ModalFooter, Button } from '@/components/ui'
import { useCategories } from '@/lib/queries/categories'
import { useBulkUpdatePreview, useBulkUpdateCategory } from '@/lib/queries/transactions'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { CategoryChangeModalProps } from './types'

export function CategoryChangeModal({
  isOpen,
  onClose,
  transaction,
  accountId,
  onSuccess,
}: CategoryChangeModalProps) {
  const queryClient = useQueryClient()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
  const [applyToAll, setApplyToAll] = useState(false)
  const [saveMapping, setSaveMapping] = useState(false)

  const { data: categoriesData } = useCategories(accountId)
  const categories = categoriesData?.categories || []

  // Obtener el patron de descripcion (texto antes del primer numero o todo si no hay numeros)
  const descriptionPattern = useMemo(() => {
    if (!transaction) return ''
    // Usar la descripcion completa como patron
    return transaction.description
  }, [transaction])

  // Preview de cuantas transacciones seran afectadas
  const { data: previewData, isLoading: isLoadingPreview } = useBulkUpdatePreview(
    accountId,
    applyToAll ? descriptionPattern : ''
  )

  const bulkUpdateMutation = useBulkUpdateCategory()

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
      await bulkUpdateMutation.mutateAsync({
        account_id: accountId,
        description_pattern: applyToAll ? descriptionPattern : transaction.description,
        subcategory_id: selectedSubcategoryId,
        save_mapping: saveMapping,
      })

      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['transactions'] })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error al actualizar categoria:', error)
    }
  }

  const affectedCount = previewData?.count || 1

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cambiar categoria" size="lg">
      {transaction && (
        <div className="space-y-6">
          {/* Descripcion de la transaccion */}
          <div className="p-3 bg-layer-2 rounded-lg">
            <p className="text-xs text-text-secondary mb-1">Transaccion seleccionada</p>
            <p className="text-sm text-text-primary font-medium">{transaction.description}</p>
          </div>

          {/* Selector de categoria */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Categoria</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full h-11 px-4 py-2 text-sm rounded-md border bg-layer-1 text-text-primary border-layer-3 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Sin categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de subcategoria */}
            {selectedCategoryId && subcategories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Subcategoria
                </label>
                <select
                  value={selectedSubcategoryId || ''}
                  onChange={(e) => setSelectedSubcategoryId(e.target.value || null)}
                  className="w-full h-11 px-4 py-2 text-sm rounded-md border bg-layer-1 text-text-primary border-layer-3 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Selecciona subcategoria</option>
                  {subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Opciones de bulk update */}
          <div className="space-y-3 border-t border-layer-3 pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-layer-3 text-accent focus:ring-accent"
              />
              <div>
                <p className="text-sm text-text-primary">Aplicar a todas las transacciones similares</p>
                <p className="text-xs text-text-secondary">
                  Cambiara la categoria de todas las transacciones con descripcion similar
                </p>
              </div>
            </label>

            {applyToAll && (
              <div className="ml-7 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  {isLoadingPreview ? (
                    <span className="text-sm text-warning flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Calculando...
                    </span>
                  ) : (
                    <span className="text-sm text-warning">
                      Se actualizaran <strong>{affectedCount}</strong> transacciones
                    </span>
                  )}
                </div>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={saveMapping}
                onChange={(e) => setSaveMapping(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-layer-3 text-accent focus:ring-accent"
              />
              <div>
                <p className="text-sm text-text-primary">Recordar para futuras importaciones</p>
                <p className="text-xs text-text-secondary">
                  Las proximas transacciones con esta descripcion se categorizaran automaticamente
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
        <Button
          onClick={handleSave}
          disabled={bulkUpdateMutation.isPending}
        >
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
