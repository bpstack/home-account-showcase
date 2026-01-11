'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { categories as categoriesApi, subcategories as subcategoriesApi } from '@/lib/apiClient'
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Modal, ModalFooter, Select } from '@/components/ui'
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react'
import type { Category, Subcategory } from '@/lib/apiClient'

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

interface CategoryForm {
  name: string
  color: string
}

interface SubcategoryForm {
  name: string
}

const emptyCategoryForm: CategoryForm = { name: '', color: '#3b82f6' }
const emptySubcategoryForm: SubcategoryForm = { name: '' }

export default function CategoriesPage() {
  const { account } = useAuth()
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingDefaults, setIsAddingDefaults] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal de categoría (crear/editar)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm)
  const [isSavingCategory, setIsSavingCategory] = useState(false)

  // Modal de subcategoría (crear/editar)
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false)
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null)
  const [parentCategoryId, setParentCategoryId] = useState<string>('')
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryForm>(emptySubcategoryForm)
  const [isSavingSubcategory, setIsSavingSubcategory] = useState(false)

  // Modal de confirmar borrar categoría
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [orphanedCount, setOrphanedCount] = useState(0)
  const [reassignCategoryId, setReassignCategoryId] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (account) {
      loadCategories()
    }
  }, [account])

  async function loadCategories() {
    if (!account) return
    setIsLoading(true)
    setError(null)

    try {
      const response = await categoriesApi.getAll(account.id)
      setCategoryList(response.categories)
    } catch (err) {
      console.error('Error loading categories:', err)
      setError('Error al cargar categorías')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddDefaultCategories() {
    if (!account) return
    setIsAddingDefaults(true)
    setError(null)

    try {
      await categoriesApi.addDefaults(account.id)
      await loadCategories()
    } catch (err: any) {
      setError(err.message || 'Error al agregar categorías por defecto')
    } finally {
      setIsAddingDefaults(false)
    }
  }

  // === CATEGORÍA ===

  function openCreateCategoryModal() {
    setEditingCategory(null)
    setCategoryForm(emptyCategoryForm)
    setShowCategoryModal(true)
  }

  function openEditCategoryModal(category: Category) {
    setEditingCategory(category)
    setCategoryForm({ name: category.name, color: category.color })
    setShowCategoryModal(true)
  }

  async function handleSaveCategory() {
    if (!account || !categoryForm.name.trim()) return

    setIsSavingCategory(true)
    setError(null)

    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, {
          name: categoryForm.name,
          color: categoryForm.color,
        })
      } else {
        await categoriesApi.create({
          account_id: account.id,
          name: categoryForm.name,
          color: categoryForm.color,
        })
      }

      setShowCategoryModal(false)
      await loadCategories()
    } catch (err: any) {
      setError(err.message || 'Error al guardar categoría')
    } finally {
      setIsSavingCategory(false)
    }
  }

  // === SUBCATEGORÍA ===

  function openCreateSubcategoryModal(categoryId: string) {
    setEditingSubcategory(null)
    setParentCategoryId(categoryId)
    setSubcategoryForm(emptySubcategoryForm)
    setShowSubcategoryModal(true)
  }

  function openEditSubcategoryModal(sub: Subcategory, categoryId: string) {
    setEditingSubcategory(sub)
    setParentCategoryId(categoryId)
    setSubcategoryForm({ name: sub.name })
    setShowSubcategoryModal(true)
  }

  async function handleSaveSubcategory() {
    if (!parentCategoryId || !subcategoryForm.name.trim()) return

    setIsSavingSubcategory(true)
    setError(null)

    try {
      if (editingSubcategory) {
        await subcategoriesApi.update(editingSubcategory.id, {
          name: subcategoryForm.name,
        })
      } else {
        await subcategoriesApi.create({
          category_id: parentCategoryId,
          name: subcategoryForm.name,
        })
      }

      setShowSubcategoryModal(false)
      await loadCategories()
    } catch (err: any) {
      setError(err.message || 'Error al guardar subcategoría')
    } finally {
      setIsSavingSubcategory(false)
    }
  }

  async function handleDeleteSubcategory(sub: Subcategory) {
    if (!confirm(`¿Eliminar "${sub.name}"?`)) return

    try {
      await subcategoriesApi.delete(sub.id)
      await loadCategories()
    } catch (err: any) {
      setError(err.message || 'Error al eliminar subcategoría')
    }
  }

  // === BORRAR CATEGORÍA ===

  async function handleDeleteClick(category: Category) {
    setCategoryToDelete(category)
    setReassignCategoryId('')

    try {
      const response = await categoriesApi.getOrphanedCount(category.id)
      setOrphanedCount(response.count)
    } catch (err) {
      console.error('Error checking orphaned transactions:', err)
      setOrphanedCount(0)
    }

    setShowDeleteModal(true)
  }

  async function handleConfirmDelete() {
    if (!categoryToDelete) return

    setIsDeleting(true)
    setError(null)

    try {
      if (orphanedCount > 0 && reassignCategoryId) {
        await categoriesApi.reassignTransactions(categoryToDelete.id, reassignCategoryId)
      }

      await categoriesApi.delete(categoryToDelete.id)
      await loadCategories()
      setShowDeleteModal(false)
      setCategoryToDelete(null)
    } catch (err: any) {
      setError(err.message || 'Error al eliminar categoría')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const getSubcategories = (category: Category): Subcategory[] => {
    return (category as any).subcategories || []
  }

  const hasCategories = categoryList.length > 0

  const reassignOptions = categoryList
    .filter((c) => c.id !== categoryToDelete?.id)
    .map((c) => ({ value: c.id, label: c.name }))

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-danger/10 border border-danger/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-danger" />
          <span className="text-sm text-danger">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
            ×
          </Button>
        </div>
      )}

      {!isLoading && !hasCategories && (
        <div className="mb-6 p-6 bg-layer-2 border border-layer-3 rounded-lg text-center">
          <h3 className="text-lg font-medium text-text-primary mb-2">Sin categorías definidas</h3>
          <p className="text-sm text-text-secondary mb-4">
            Agrega las categorías por defecto basadas en tu control de gastos 2025
          </p>
          <Button onClick={handleAddDefaultCategories} isLoading={isAddingDefaults}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Agregar categorías por defecto
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-2 mb-6">
        <Button variant="outline" onClick={handleAddDefaultCategories} isLoading={isAddingDefaults}>
          <RefreshCw className="h-4 w-4" />
          Restablecer categorías
        </Button>
        <Button onClick={openCreateCategoryModal}>
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      {isLoading ? (
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
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-text-secondary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-text-secondary" />
                      )}
                    </button>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCategoryModal(category)}>
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
                        <div key={sub.id} className="flex items-center justify-between py-2 px-3 bg-layer-2 rounded-md">
                          <span className="text-sm text-text-primary">{sub.name}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditSubcategoryModal(sub, category.id)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-danger hover:text-danger" onClick={() => handleDeleteSubcategory(sub)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="w-full justify-start text-text-secondary" onClick={() => openCreateSubcategoryModal(category.id)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Añadir subcategoría
                      </Button>
                    </div>
                  </CardContent>
                )}

                {!isExpanded && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-text-secondary">{subcategories.length} subcategorías</p>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      ) : null}

      {/* Modal Categoría (Crear/Editar) */}
      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title={editingCategory ? 'Editar categoría' : 'Nueva categoría'}>
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
                    categoryForm.color === color ? 'border-white ring-2 ring-accent' : 'border-transparent hover:border-text-secondary'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCategoryForm({ ...categoryForm, color })}
                />
              ))}
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowCategoryModal(false)}>Cancelar</Button>
          <Button onClick={handleSaveCategory} isLoading={isSavingCategory}>
            {editingCategory ? 'Guardar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Subcategoría (Crear/Editar) */}
      <Modal isOpen={showSubcategoryModal} onClose={() => setShowSubcategoryModal(false)} title={editingSubcategory ? 'Editar subcategoría' : 'Nueva subcategoría'}>
        <div className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Ej: Almacén"
            value={subcategoryForm.name}
            onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowSubcategoryModal(false)}>Cancelar</Button>
          <Button onClick={handleSaveSubcategory} isLoading={isSavingSubcategory}>
            {editingSubcategory ? 'Guardar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Confirmar Eliminar Categoría */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar categoría" size="lg">
        {categoryToDelete && (
          <div className="space-y-4">
            {orphanedCount > 0 && (
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">Esta categoría tiene {orphanedCount} transacción(es) asociada(s)</p>
                    <p className="text-sm text-text-secondary mt-1">Las transacciones perderán su categoría.</p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-text-primary">
              ¿Estás seguro de que quieres eliminar <strong>{categoryToDelete.name}</strong>?
            </p>

            {orphanedCount > 0 && (
              <div className="pt-4 border-t border-layer-3">
                <label className="block text-sm font-medium text-text-primary mb-2">¿Reasignar transacciones a otra categoría?</label>
                <Select
                  options={[{ value: '', label: 'Mantener como "Sin categoría"' }, ...reassignOptions]}
                  value={reassignCategoryId}
                  onChange={(e) => setReassignCategoryId(e.target.value)}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancelar</Button>
          <Button variant="danger" onClick={handleConfirmDelete} isLoading={isDeleting}>Eliminar</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
