'use client'

import { useState } from 'react'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, Input, Select, Modal, ModalFooter } from '@/components/ui'
import { mockTransactions, mockCategories, getCategoryBySubcategory, getSubcategory } from '@/lib/mock/data'
import { Plus, Search, Filter, Edit2, Trash2 } from 'lucide-react'

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredTransactions = mockTransactions.filter((tx) => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !filterCategory || (tx.subcategoryId && getCategoryBySubcategory(tx.subcategoryId)?.id === filterCategory)
    return matchesSearch && matchesCategory
  })

  const categoryOptions = [
    { value: '', label: 'Todas las categorías' },
    ...mockCategories.map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <div>
      <Header title="Transacciones" description="Gestiona tus ingresos y gastos" />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder="Buscar transacciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select
            options={categoryOptions}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-48"
          />
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-layer-3 bg-layer-1">
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Fecha</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Descripción</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Categoría</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Subcategoría</th>
                  <th className="text-right py-3 px-4 text-text-secondary font-medium">Importe</th>
                  <th className="text-right py-3 px-4 text-text-secondary font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => {
                  const category = tx.subcategoryId ? getCategoryBySubcategory(tx.subcategoryId) : null
                  const subcategory = tx.subcategoryId ? getSubcategory(tx.subcategoryId) : null
                  return (
                    <tr key={tx.id} className="border-b border-layer-2 hover:bg-layer-1">
                      <td className="py-3 px-4 text-text-primary">{tx.date}</td>
                      <td className="py-3 px-4 text-text-primary">{tx.description}</td>
                      <td className="py-3 px-4">
                        {category ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${category.color}20`,
                              color: category.color,
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </span>
                        ) : (
                          <span className="text-text-secondary text-xs">Sin categoría</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-text-secondary text-xs">
                        {subcategory?.name || '-'}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${tx.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)} €
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="py-12 text-center text-text-secondary">
              No se encontraron transacciones
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nueva Transacción */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva transacción" size="lg">
        <form className="space-y-4">
          <Input label="Descripción" placeholder="Ej: Compra supermercado" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha" type="date" />
            <Input label="Importe" type="number" step="0.01" placeholder="0.00" />
          </div>
          <Select
            label="Categoría"
            options={mockCategories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </form>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => setIsModalOpen(false)}>
            Guardar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
