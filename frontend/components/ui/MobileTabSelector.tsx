'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Check } from 'lucide-react'
import { Modal } from '@/components/ui'

export interface Tab {
  id: string
  label: string
  icon?: ReactNode
  description?: string
}

interface MobileTabSelectorProps {
  tabs: Tab[]
  activeTabId: string
  onTabChange: (_tabId: string) => void
  className?: string
  /** Mostrar solo en mobile (hidden en desktop por defecto) */
  mobileOnly?: boolean
}

export function MobileTabSelector({
  tabs,
  activeTabId,
  onTabChange,
  className,
  mobileOnly = true,
}: MobileTabSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0]

  const handleTabSelect = useCallback(
    (tabId: string) => {
      onTabChange(tabId)
      setIsModalOpen(false)
    },
    [onTabChange]
  )

  return (
    <>
      {/* Link-style trigger button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={cn(
          'flex items-center justify-center gap-2 px-2 py-1.5',
          'text-sm font-medium text-blue-600 dark:text-blue-400',
          'hover:text-blue-700 dark:hover:text-blue-300',
          'transition-colors duration-200',
          'bg-transparent border-0 cursor-pointer',
          'relative group',
          mobileOnly && 'md:hidden',
          className
        )}
      >
        {/* Icon and label */}
        <div className="flex items-center gap-2">
          {activeTab?.icon && <span className="h-4 w-4">{activeTab.icon}</span>}
          <span>{activeTab?.label}</span>
        </div>

        {/* Chevron down with animation */}
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform duration-300',
            'group-hover:text-blue-700 dark:group-hover:text-blue-300'
          )}
        />

        {/* Subtle underline on hover */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-blue-600 dark:bg-blue-400 group-hover:w-full transition-all duration-300" />
      </button>

      {/* Modal para cambiar tabs */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Cambiar Vista</h2>
            <p className="text-sm text-muted-foreground mt-1">Selecciona la vista que deseas ver</p>
          </div>

          {/* Tab options */}
          <div className="space-y-2">
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-lg',
                    'transition-all duration-200',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400'
                      : 'bg-muted border-2 border-transparent hover:bg-muted/80 hover:border-blue-200 dark:hover:border-blue-900/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    {tab.icon && (
                      <div
                        className={cn(
                          'h-5 w-5 flex items-center justify-center',
                          isActive ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                        )}
                      >
                        {tab.icon}
                      </div>
                    )}

                    {/* Label and description */}
                    <div className="text-left">
                      <p
                        className={cn(
                          'font-medium text-sm',
                          isActive ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'
                        )}
                      >
                        {tab.label}
                      </p>
                      {tab.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{tab.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Checkmark */}
                  {isActive && (
                    <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </Modal>
    </>
  )
}
