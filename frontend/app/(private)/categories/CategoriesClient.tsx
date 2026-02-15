'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useAddDefaultCategories,
  useOrphanedCount,
  useReassignTransactions,
  useCreateSubcategory,
  useUpdateSubcategory,
  useDeleteSubcategory,
} from '@/lib/queries/categories'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Modal,
  ModalFooter,
  Select,
  ConfirmDialog,
} from '@/components/ui'
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Category, Subcategory } from '@/lib/apiClient'

const COLORS = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ec4899',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
]

interface CategoryForm {
  name: string
  color: string
}

interface SubcategoryForm {
  name: string
}

const emptyCategoryForm: CategoryForm = { name: '', color: '#3b82f6' }
const emptySubcategoryForm: SubcategoryForm = { name: '' }

function CategoriesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <div className="h-10 w-40 bg-layer-2 rounded animate-pulse" />
        <div className="h-10 w-40 bg-layer-2 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-layer-1 border border-layer-3 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-32 bg-layer-3 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CategoriesPageFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
      <span className="ml-2 text-text-secondary">Cargando...</span>
    </div>
  )
}

interface CategoriesClientProps {
  initialCategories?: Category[]
}

export default function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  return (
    <Suspense fallback={<CategoriesPageFallback />}>
      <CategoriesContent initialCategories={initialCategories} />
    </Suspense>
  )
}

function CategoriesContent({ initialCategories }: CategoriesClientProps) {
  const { account } = useAuth()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm)
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null)
  const [parentCategoryId, setParentCategoryId] = useState<string>('')
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryForm>(emptySubcategoryForm)

  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [reassignCategoryId, setReassignCategoryId] = useState('')

  const {
    data: categoriesData,
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useCategories(account?.id || '', {
    initialData: initialCategories ? { categories: initialCategories } : undefined,
  })
  const orphanedQuery = useOrphanedCount(categoryToDelete?.id || '')

  const createCategoryMutation = useCreateCategory()
  const updateCategoryMutation = useUpdateCategory()
  const deleteCategoryMutation = useDeleteCategory()
  const addDefaultsMutation = useAddDefaultCategories()
  const reassignMutation = useReassignTransactions()
  const createSubcategoryMutation = useCreateSubcategory()
  const updateSubcategoryMutation = useUpdateSubcategory()
  const deleteSubcategoryMutation = useDeleteSubcategory()

  const categoryList = categoriesData?.categories || []

  function toggleCategory(categoryId: string) {
    setExpandedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    )
  }

  function getSubcategories(category: Category): Subcategory[] {
    return (category as any).subcategories || []
  }

  const hasCategories = categoryList.length > 0
  const reassignOptions = categoryList
    .filter((c) => c.id !== categoryToDelete?.id)
    .map((c) => ({ value: c.id, label: c.name }))

  function openCreateCategoryModal() {
    setEditingCategory(null)
    setCategoryForm(emptyCategoryForm)
    setShowCategoryModal(true)
  }

  function openEditCategoryModal(category: Category) {
    setEditingCategory(category)
    setCategoryForm({ name: category.name, color: category.color })
  }

  function handleSaveCategory() {
    if (!account || !categoryForm.name.trim()) return

    const mutation = editingCategory
      ? updateCategoryMutation.mutateAsync({
          id: editingCategory.id,
          data: { name: categoryForm.name, color: categoryForm.color },
          accountId: account.id,
        })
      : createCategoryMutation.mutateAsync({
          account_id: account.id,
          name: categoryForm.name,
          color: categoryForm.color,
        })

    toast.promise(mutation, {
      loading: editingCategory ? 'Actualizando categoría...' : 'Creando categoría...',
      success: () => {
        queryClient.invalidateQueries({ queryKey: ['categories'] })
        setEditingCategory(null)
        setShowCategoryModal(false)
        return editingCategory
          ? 'Categoría actualizada correctamente'
          : 'Categoría creada correctamente'
      },
      error: 'Error al guardar la categoría',
    })
  }

  function openCreateSubcategoryModal(categoryId: string) {
    setEditingSubcategory(null)
    setParentCategoryId(categoryId)
    setSubcategoryForm(emptySubcategoryForm)
  }

  function openEditSubcategoryModal(sub: Subcategory, categoryId: string) {
    setEditingSubcategory(sub)
    setParentCategoryId(categoryId)
    setSubcategoryForm({ name: sub.name })
  }

  function handleSaveSubcategory() {
    if (!parentCategoryId || !subcategoryForm.name.trim() || !account) return

    const mutation = editingSubcategory
      ? updateSubcategoryMutation.mutateAsync({
          id: editingSubcategory.id,
          data: { name: subcategoryForm.name },
          accountId: account.id,
        })
      : createSubcategoryMutation.mutateAsync({
          category_id: parentCategoryId,
          name: subcategoryForm.name,
          accountId: account.id,
        })

    toast.promise(mutation, {
      loading: editingSubcategory ? 'Actualizando subcategoría...' : 'Creando subcategoría...',
      success: () => {
        queryClient.invalidateQueries({ queryKey: ['categories'] })
        setEditingSubcategory(null)
        setParentCategoryId('')
        return editingSubcategory
          ? 'Subcategoría actualizada correctamente'
          : 'Subcategoría creada correctamente'
      },
      error: 'Error al guardar la subcategoría',
    })
  }

  function handleDeleteSubcategory(sub: Subcategory) {
    toast.promise(deleteSubcategoryMutation.mutateAsync(sub.id), {
      loading: 'Eliminando subcategoría...',
      success: () => {
        queryClient.invalidateQueries({ queryKey: ['categories'] })
        return `"${sub.name}" eliminada`
      },
      error: 'Error al eliminar la subcategoría',
    })
  }

  function handleDeleteClick(category: Category) {
    setCategoryToDelete(category)
    setReassignCategoryId('')
  }

  function handleConfirmDelete() {
    if (!categoryToDelete) return
    if (orphanedQuery.data?.count && orphanedQuery.data.count > 0 && reassignCategoryId) {
      reassignMutation.mutate({ fromId: categoryToDelete.id, toId: reassignCategoryId })
    }
    toast.promise(deleteCategoryMutation.mutateAsync(categoryToDelete.id), {
      loading: 'Eliminando categoría...',
      success: () => {
        queryClient.invalidateQueries({ queryKey: ['categories'] })
        setCategoryToDelete(null)
        return 'Categoría eliminada correctamente'
      },
      error: 'Error al eliminar la categoría',
    })
  }

  function handleAddDefaultCategories() {
    if (!account) return
    toast.promise(addDefaultsMutation.mutateAsync(account.id), {
      loading: 'Añadiendo categorías por defecto...',
      success: () => {
        queryClient.invalidateQueries({ queryKey: ['categories'] })
        return 'Categorías por defecto añadidas correctamente'
      },
      error: 'Error al añadir categorías',
    })
  }

  const error =
    createCategoryMutation.error?.message ||
    updateCategoryMutation.error?.message ||
    deleteCategoryMutation.error?.message ||
    addDefaultsMutation.error?.message ||
    categoriesError?.message

  const orphanedCount = orphanedQuery.data?.count || 0

  const isCategoryModalOpen = !!editingCategory || showCategoryModal
  const showSubcategoryModal =
    !!editingSubcategory || (editingSubcategory === null && parentCategoryId !== '')
  const showDeleteModal = !!categoryToDelete

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
      <div className="px-4 md:px-6 py-6">
        {error && (
          <div className="mb-4 p-4 bg-danger/10 border border-danger/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-danger" />
            <span className="text-sm text-danger">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                createCategoryMutation.reset()
                updateCategoryMutation.reset()
                deleteCategoryMutation.reset()
                addDefaultsMutation.reset()
              }}
              className="ml-auto"
            >
              ×
            </Button>
          </div>
        )}

        {!isLoadingCategories && !hasCategories && (
          <div className="mb-6 p-6 bg-layer-2 border border-layer-3 rounded-lg text-center">
            <h3 className="text-lg font-medium text-text-primary mb-2">Sin categorías definidas</h3>
            <p className="text-sm text-text-secondary mb-4">
              Agrega las categorías por defecto basadas en tu control de gastos 2025
            </p>
            <Button onClick={handleAddDefaultCategories} isLoading={addDefaultsMutation.isPending}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Agregar categorías por defecto
            </Button>
          </div>
        )}

        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={handleAddDefaultCategories}
            disabled={addDefaultsMutation.isPending}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4 text-accent stroke-[2.5]" />
            Restablecer categorías
          </button>
          <button
            onClick={openCreateCategoryModal}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <Plus className="h-4 w-4 text-accent stroke-[2.5]" />
            Nueva categoría
          </button>
        </div>

        {isLoadingCategories ? (
          <div className="text-center py-12 text-text-secondary">Cargando categorías...</div>
        ) : hasCategories ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryList.map((category) => {
              const isExpanded = expandedCategories.includes(category.id)
              const subcategories = getSubcategories(category)

              return (
                <Card key={category.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="flex items-center gap-3 text-left"
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <CardTitle className="text-base">{category.name}</CardTitle>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-text-secondary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-text-secondary" />
                        )}
                      </button>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditCategoryModal(category)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-danger hover:text-danger"
                          onClick={() => handleDeleteClick(category)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-2">
                      <div className="space-y-2 pl-7">
                        {subcategories.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between py-2 px-3 bg-layer-2 rounded-md"
                          >
                            <span className="text-sm text-text-primary">{sub.name}</span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => openEditSubcategoryModal(sub, category.id)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-danger hover:text-danger"
                                onClick={() => handleDeleteSubcategory(sub)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-text-secondary"
                          onClick={() => openCreateSubcategoryModal(category.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Añadir subcategoría
                        </Button>
                      </div>
                    </CardContent>
                  )}

                  {!isExpanded && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-text-secondary">
                        {subcategories.length} subcategorías
                      </p>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        ) : null}
      </div>

      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setEditingCategory(null)
          setShowCategoryModal(false)
        }}
        title={editingCategory ? 'Editar categoría' : 'Nueva categoría'}
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Ej: Viajes"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Color</label>
            <div className="flex gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-colors ${
                    categoryForm.color === color
                      ? 'border-white ring-2 ring-accent'
                      : 'border-transparent hover:border-text-secondary'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCategoryForm({ ...categoryForm, color })}
                />
              ))}
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setEditingCategory(null)
              setShowCategoryModal(false)
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveCategory}
            isLoading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
          >
            {editingCategory ? 'Guardar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={showSubcategoryModal}
        onClose={() => {
          setEditingSubcategory(null)
          setParentCategoryId('')
        }}
        title={editingSubcategory ? 'Editar subcategoría' : 'Nueva subcategoría'}
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Ej: Almacén"
            value={subcategoryForm.name}
            onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
          />
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setEditingSubcategory(null)
              setParentCategoryId('')
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveSubcategory}
            isLoading={createSubcategoryMutation.isPending || updateSubcategoryMutation.isPending}
          >
            {editingSubcategory ? 'Guardar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Modal>

      <ConfirmDialog
        open={showDeleteModal}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        title="Eliminar categoría"
        confirmLabel="Eliminar"
        onConfirm={handleConfirmDelete}
        isLoading={deleteCategoryMutation.isPending || reassignMutation.isPending}
        variant="danger"
        size="lg"
      >
        {categoryToDelete && (
          <div className="space-y-4">
            {orphanedCount > 0 && (
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">
                      Esta categoría tiene {orphanedCount} transacción(es) asociada(s)
                    </p>
                    <p className="text-sm text-text-secondary mt-1">
                      Las transacciones perderán su categoría.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-text-primary">
              ¿Estás seguro de que quieres eliminar <strong>{categoryToDelete.name}</strong>?
            </p>

            {orphanedCount > 0 && (
              <div className="pt-4 border-t border-layer-3">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  ¿Reasignar transacciones a otra categoría?
                </label>
                <Select
                  options={[
                    { value: '', label: 'Mantener como "Sin categoría"' },
                    ...reassignOptions,
                  ]}
                  value={reassignCategoryId}
                  onChange={(e) => setReassignCategoryId(e.target.value)}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}
