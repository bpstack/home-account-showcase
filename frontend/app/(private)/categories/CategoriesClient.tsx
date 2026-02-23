'use client'

import { Suspense, useState } from 'react'
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
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Category, Subcategory } from '@/lib/apiClient'
import Link from 'next/link'
import {
  validateCategory,
  validateUpdateCategory,
  validateSubcategory,
  validateUpdateSubcategory,
} from '@/validators/category-validators'

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

function CategoriesPageFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">Cargando...</span>
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
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm)
  const [categoryFieldErrors, setCategoryFieldErrors] = useState<Record<string, string>>({})
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null)
  const [parentCategoryId, setParentCategoryId] = useState<string>('')
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryForm>(emptySubcategoryForm)
  const [subcategoryFieldErrors, setSubcategoryFieldErrors] = useState<Record<string, string>>({})

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
    setCategoryFieldErrors({})
    setShowCategoryModal(true)
  }

  function openEditCategoryModal(category: Category) {
    setEditingCategory(category)
    setCategoryForm({ name: category.name, color: category.color })
    setCategoryFieldErrors({})
  }

  function handleSaveCategory() {
    if (!account) return

    const validation = editingCategory
      ? validateUpdateCategory({ name: categoryForm.name, color: categoryForm.color })
      : validateCategory({
          account_id: account.id,
          name: categoryForm.name,
          color: categoryForm.color,
        })

    if (!validation.success) {
      setCategoryFieldErrors(validation.errors)
      return
    }

    setCategoryFieldErrors({})

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
    setSubcategoryFieldErrors({})
  }

  function openEditSubcategoryModal(sub: Subcategory, categoryId: string) {
    setEditingSubcategory(sub)
    setParentCategoryId(categoryId)
    setSubcategoryForm({ name: sub.name })
    setSubcategoryFieldErrors({})
  }

  function handleSaveSubcategory() {
    if (!parentCategoryId || !account) return

    const validation = editingSubcategory
      ? validateUpdateSubcategory({ name: subcategoryForm.name })
      : validateSubcategory({ category_id: parentCategoryId, name: subcategoryForm.name })

    if (!validation.success) {
      setSubcategoryFieldErrors(validation.errors)
      return
    }

    setSubcategoryFieldErrors({})

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
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
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
          <div className="mb-6 p-6 bg-muted/50 border border-border rounded-xl text-center">
            <h3 className="text-lg font-medium text-foreground mb-2">Sin categorías definidas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Agrega las categorías por defecto basadas en tu control de gastos 2025
            </p>
            <Button onClick={handleAddDefaultCategories} isLoading={addDefaultsMutation.isPending}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Agregar categorías por defecto
            </Button>
          </div>
        )}

        <div className="flex justify-center gap-3 mb-6">
          <button
            onClick={handleAddDefaultCategories}
            disabled={addDefaultsMutation.isPending}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4 text-primary stroke-[2.5]" />
            Restablecer categorías
          </button>
          <button
            onClick={openCreateCategoryModal}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4 text-primary stroke-[2.5]" />
            Nueva categoría
          </button>
        </div>

        {isLoadingCategories ? (
          <div className="text-center py-12 text-muted-foreground">Cargando categorías...</div>
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
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                          className="h-8 w-8 text-destructive hover:text-destructive"
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
                            className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                          >
                            <span className="text-sm text-foreground">{sub.name}</span>
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
                                className="h-6 w-6 text-destructive hover:text-destructive"
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
                          className="w-full justify-start text-muted-foreground"
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
                      <p className="text-sm text-muted-foreground">
                        {subcategories.length} subcategorías
                      </p>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        ) : null}

        {hasCategories && (
          <Link
            href="/profile?panel=settings&tab=budget"
            className="mt-8 flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl hover:from-primary/20 hover:to-primary/10 transition-all group"
          >
            <div className="p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">¿Necesitas un presupuesto?</p>
              <p className="text-sm text-muted-foreground">
                Crea tu propio presupuesto según las categorías y controla tus gastos
              </p>
            </div>
          </Link>
        )}
      </div>

      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setEditingCategory(null)
          setShowCategoryModal(false)
          setCategoryFieldErrors({})
        }}
        title={editingCategory ? 'Editar categoría' : 'Nueva categoría'}
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Ej: Viajes"
            value={categoryForm.name}
            onChange={(e) => {
              setCategoryForm({ ...categoryForm, name: e.target.value })
              if (categoryFieldErrors.name) {
                setCategoryFieldErrors((prev) => ({ ...prev, name: '' }))
              }
            }}
            error={categoryFieldErrors.name}
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    categoryForm.color === color
                      ? 'border-white ring-2 ring-primary scale-110'
                      : 'border-transparent hover:border-muted-foreground hover:scale-105'
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
              setCategoryFieldErrors({})
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
          setSubcategoryFieldErrors({})
        }}
        title={editingSubcategory ? 'Editar subcategoría' : 'Nueva subcategoría'}
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Ej: Almacén"
            value={subcategoryForm.name}
            onChange={(e) => {
              setSubcategoryForm({ ...subcategoryForm, name: e.target.value })
              if (subcategoryFieldErrors.name) {
                setSubcategoryFieldErrors((prev) => ({ ...prev, name: '' }))
              }
            }}
            error={subcategoryFieldErrors.name}
          />
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setEditingSubcategory(null)
              setParentCategoryId('')
              setSubcategoryFieldErrors({})
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
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Esta categoría tiene {orphanedCount} transacción(es) asociada(s)
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Las transacciones perderán su categoría.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-foreground">
              ¿Estás seguro de que quieres eliminar <strong>{categoryToDelete.name}</strong>?
            </p>

            {orphanedCount > 0 && (
              <div className="pt-4 border-t border-border">
                <label className="block text-sm font-medium text-foreground mb-2">
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
