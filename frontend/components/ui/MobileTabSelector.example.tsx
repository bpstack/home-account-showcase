/**
 * EJEMPLO DE USO: MobileTabSelector
 *
 * Este es un componente reutilizable que proporciona una interfaz atractiva
 * para cambiar tabs en dispositivos móviles mediante una modal.
 *
 * Características:
 * - Aspecto de enlace centrado (no botón azul)
 * - Icono con flecha dropdown
 * - Modal atractiva en mobile
 * - Fácilmente reutilizable en toda la app
 */

'use client'

import { useState } from 'react'
import { MobileTabSelector } from '@/components/ui'
import { LayoutDashboard, History, LineChart, Coins, TrendingUp } from 'lucide-react'

// EJEMPLO 1: Uso básico en Dashboard
export function DashboardTabsExample() {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'history', label: 'Histórico', icon: <History className="h-4 w-4" /> },
    { id: 'stats', label: 'Estadísticas', icon: <LineChart className="h-4 w-4" /> },
    { id: 'investment', label: 'Inversión', icon: <Coins className="h-4 w-4" /> },
  ]

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 py-4">
      <div className="md:hidden flex justify-center">
        <MobileTabSelector tabs={tabs} activeTabId={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tu contenido aquí */}
      <div>Contenido del tab: {activeTab}</div>
    </div>
  )
}

// EJEMPLO 2: Con descripción adicional en cada tab
export function TransactionsTabsExample() {
  const [activeTab, setActiveTab] = useState('all')

  const tabs = [
    {
      id: 'all',
      label: 'Todas',
      icon: <LayoutDashboard className="h-4 w-4" />,
      description: 'Todas las transacciones',
    },
    {
      id: 'income',
      label: 'Ingresos',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Solo ingresos',
    },
    {
      id: 'expenses',
      label: 'Gastos',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Solo gastos',
    },
  ]

  return (
    <div className="p-4">
      <MobileTabSelector
        tabs={tabs}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
        className="mb-4"
      />

      {/* Contenido */}
      <div className="mt-6">Ver {activeTab}</div>
    </div>
  )
}

// EJEMPLO 3: Integración con Tabs component en variant underline-responsive
export function FullTabsIntegrationExample() {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'details', label: 'Detalles', icon: <History className="h-4 w-4" /> },
  ]

  return (
    <div>
      {/* En desktop: muestra tabs normales */}
      {/* En mobile: automáticamente usa MobileTabSelector via Tabs component */}
      <div className="hidden md:flex border-b border-gray-200 dark:border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-blue-600'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile: usa MobileTabSelector automáticamente */}
      <div className="md:hidden flex justify-center py-4">
        <MobileTabSelector tabs={tabs} activeTabId={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Contenido */}
      <div className="p-4">Mostrando: {activeTab}</div>
    </div>
  )
}
