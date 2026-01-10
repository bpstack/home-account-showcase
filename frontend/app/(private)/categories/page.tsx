'use client'

import { useState } from 'react'
import { Header } from '@/components/layout'
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Modal, ModalFooter } from '@/components/ui'
import { mockCategories } from '@/lib/mock/data'
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

export default function CategoriesPage() {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  return (
    <div>
      <Header title="Categorías" description="Organiza tus gastos e ingresos" />

      <div className="flex justify-end mb-6">
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockCategories.map((category) => {
          const isExpanded = expandedCategories.includes(category.id)
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
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-2">
                  <div className="space-y-2 pl-7">
                    {category.subcategories.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between py-2 px-3 bg-layer-2 rounded-md"
                      >
                        <span className="text-sm text-text-primary">{sub.name}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-danger hover:text-danger">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full justify-start text-text-secondary">
                      <Plus className="h-4 w-4 mr-2" />
                      Añadir subcategoría
                    </Button>
                  </div>
                </CardContent>
              )}

              {!isExpanded && (
                <CardContent className="pt-0">
                  <p className="text-sm text-text-secondary">
                    {category.subcategories.length} subcategorías
                  </p>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Modal Nueva Categoría */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva categoría">
        <form className="space-y-4">
          <Input label="Nombre" placeholder="Ej: Viajes" />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Color
            </label>
            <div className="flex gap-2">
              {['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'].map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-8 h-8 rounded-full border-2 border-transparent hover:border-text-secondary transition-colors"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </form>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => setIsModalOpen(false)}>
            Crear
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
