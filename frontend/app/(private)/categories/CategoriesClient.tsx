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
  ActionMenu,
  Button,
  Input,
  Modal,
  ModalFooter,
  Select,
  ConfirmDialog,
} from '@/components/ui'
import { Plus, Pencil, Trash2, ChevronRight, AlertCircle, Loader2, X } from 'lucide-react'
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
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<Subcategory | null>(null)
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
        setSubcategoryToDelete(null)
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
    const category = categoryToDelete
    const reassign =
      orphanedQuery.data?.count && orphanedQuery.data.count > 0 && reassignCategoryId
        ? reassignMutation.mutateAsync({ fromId: category.id, toId: reassignCategoryId })
        : Promise.resolve()
    // The transactions move first; deleting at the same time could leave them uncategorized
    const work = reassign.then(() => deleteCategoryMutation.mutateAsync(category.id))
    toast.promise(work, {
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          {hasCategories
            ? categoryList.length === 1
              ? '1 categoría'
              : `${categoryList.length} categorías`
            : ''}
        </p>
        <Button onClick={openCreateCategoryModal} className="shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva categoría
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            aria-label="Cerrar aviso"
            className="rounded p-1 hover:bg-danger/10"
            onClick={() => {
              createCategoryMutation.reset()
              updateCategoryMutation.reset()
              deleteCategoryMutation.reset()
              addDefaultsMutation.reset()
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {isLoadingCategories ? (
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando categorías
        </p>
      ) : !hasCategories ? (
        <div className="rounded-lg border border-dashed border-layer-3 px-6 py-12 text-center">
          <p className="text-sm text-text-primary">Aún no tienes categorías.</p>
          <p className="mt-1 text-sm text-text-secondary">
            Empieza con las habituales de una casa (alimentación, vivienda, ocio…) y cámbialas
            cuando quieras.
          </p>
          <Button
            className="mt-4"
            onClick={handleAddDefaultCategories}
            isLoading={addDefaultsMutation.isPending}
          >
            Añadir las categorías habituales
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-layer-3 border-y border-layer-3">
          {categoryList.map((category) => {
            const isExpanded = expandedCategories.includes(category.id)
            const subcategories = getSubcategories(category)
            return (
              <li key={category.id}>
                <div className="flex min-h-14 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    aria-expanded={isExpanded}
                    className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronRight
                      aria-hidden="true"
                      className={`h-4 w-4 flex-shrink-0 text-text-secondary transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-90' : ''}`}
                    />
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate text-sm font-medium text-text-primary">
                      {category.name}
                    </span>
                    <span className="flex-shrink-0 text-sm text-text-secondary">
                      {subcategories.length === 1
                        ? '1 subcategoría'
                        : `${subcategories.length} subcategorías`}
                    </span>
                  </button>
                  <ActionMenu
                    label={`Acciones de ${category.name}`}
                    items={[
                      {
                        label: 'Editar',
                        icon: <Pencil className="h-4 w-4" aria-hidden="true" />,
                        onSelect: () => openEditCategoryModal(category),
                      },
                      {
                        label: 'Añadir subcategoría',
                        icon: <Plus className="h-4 w-4" aria-hidden="true" />,
                        onSelect: () => openCreateSubcategoryModal(category.id),
                      },
                      {
                        label: 'Eliminar',
                        icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                        onSelect: () => handleDeleteClick(category),
                        danger: true,
                      },
                    ]}
                  />
                </div>

                {isExpanded && (
                  <ul className="mb-3 ml-[3.25rem] divide-y divide-layer-3 border-l border-layer-3">
                    {subcategories.map((sub) => (
                      <li key={sub.id} className="flex min-h-11 items-center gap-2 pl-3">
                        <span className="flex-1 truncate text-sm text-text-primary">
                          {sub.name}
                        </span>
                        <ActionMenu
                          label={`Acciones de ${sub.name}`}
                          items={[
                            {
                              label: 'Renombrar',
                              icon: <Pencil className="h-4 w-4" aria-hidden="true" />,
                              onSelect: () => openEditSubcategoryModal(sub, category.id),
                            },
                            {
                              label: 'Eliminar',
                              icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                              onSelect: () => setSubcategoryToDelete(sub),
                              danger: true,
                            },
                          ]}
                        />
                      </li>
                    ))}
                    <li className="pl-3">
                      <button
                        type="button"
                        onClick={() => openCreateSubcategoryModal(category.id)}
                        className="flex min-h-11 items-center gap-2 text-sm text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Añadir subcategoría
                      </button>
                    </li>
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {hasCategories && (
        <p className="text-sm text-text-secondary">
          Para fijar cuánto quieres gastar en cada categoría, ve a{' '}
          <Link href="/profile?panel=settings&tab=budget" className="text-accent hover:underline">
            Configuración, presupuesto
          </Link>
          .
        </p>
      )}

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
            <p className="mb-2 text-sm font-medium text-text-primary">Color</p>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  aria-pressed={categoryForm.color === color}
                  className={`h-8 w-8 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    categoryForm.color === color
                      ? 'ring-2 ring-accent ring-offset-2 ring-offset-layer-1'
                      : ''
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
              <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-text-primary">
                {orphanedCount === 1
                  ? 'Hay 1 transacción en esta categoría.'
                  : `Hay ${orphanedCount} transacciones en esta categoría.`}{' '}
                Si no la pasas a otra, se quedará sin categoría.
              </p>
            )}

            <p className="text-sm text-foreground">
              ¿Estás seguro de que quieres eliminar <strong>{categoryToDelete.name}</strong>?
            </p>

            {orphanedCount > 0 && (
              <div className="pt-4 border-t border-border">
                <Select
                  id="reassign-category"
                  label="Pasar sus transacciones a"
                  options={[
                    { value: '', label: 'Ninguna: dejarlas sin categoría' },
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

      <ConfirmDialog
        open={!!subcategoryToDelete}
        onOpenChange={(open) => !open && setSubcategoryToDelete(null)}
        title="Eliminar subcategoría"
        description={
          subcategoryToDelete
            ? `Se eliminará «${subcategoryToDelete.name}». Sus transacciones se quedarán sin categoría.`
            : undefined
        }
        confirmLabel="Eliminar"
        onConfirm={() => subcategoryToDelete && handleDeleteSubcategory(subcategoryToDelete)}
        isLoading={deleteSubcategoryMutation.isPending}
        variant="danger"
      />
    </div>
  )
}
