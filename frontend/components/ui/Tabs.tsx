'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronDown, Check } from 'lucide-react'

export interface Tab {
  id: string
  label: string
  icon?: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeTab?: string
  className?: string
  variant?: 'default' | 'pills' | 'underline-responsive'
  /** Nombre del parámetro URL (default: 'tab'). Se ignora si se usa onChange */
  paramName?: string
  /** Tab por defecto si no hay activeTab ni URL param */
  defaultTab?: string
  /** Callback para control directo. Si se proporciona, no se usa URL */
  onChange?: (tabId: string) => void
  /** Contenido adicional a mostrar a la derecha (ej: filtros) */
  rightContent?: ReactNode
}

export function Tabs({
  tabs,
  activeTab: controlledActiveTab,
  paramName = 'tab',
  defaultTab,
  onChange,
  className,
  variant = 'default',
  rightContent,
}: TabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Determinar tab activo: controlado > URL > default > primer tab
  const activeTab = controlledActiveTab
    ?? (!onChange ? searchParams.get(paramName) : null)
    ?? defaultTab
    ?? tabs[0]?.id

  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0]

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTabChange = useCallback((tabId: string) => {
    if (onChange) {
      onChange(tabId)
    } else {
      const params = new URLSearchParams(searchParams.toString())
      params.set(paramName, tabId)
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }
    setIsOpen(false)
  }, [onChange, paramName, searchParams, router, pathname])

  if (variant === 'pills') {
    return (
      <div className={cn('inline-flex p-1 bg-muted rounded-lg', className)}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon && <span className="h-4 w-4">{tab.icon}</span>}
              {tab.label}
            </button>
          )
        })}
      </div>
    )
  }

  // Underline responsive variant (dropdown mobile + tabs desktop like FourPoints)
  if (variant === 'underline-responsive') {
    return (
      <div className={cn('border-b border-gray-200 dark:border-gray-800 bg-background', className)}>
        {/* Mobile: Dropdown + rightContent */}
        <div className="md:hidden flex items-center justify-between px-2.5 py-2">

          <div className="relative w-fit" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-muted border border-border rounded-lg hover:bg-accent transition-colors"
            >
              {activeTabConfig?.icon}
              <span>{activeTabConfig?.label}</span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {tab.icon}
                        {tab.label}
                      </span>
                      {isActive && <Check className="w-4 h-4" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {/* Mobile rightContent */}
          {rightContent && (
            <div className="flex items-center">
              {rightContent}
            </div>
          )}
        </div>

        {/* Desktop: Tabs + rightContent */}
        <div className="hidden md:flex items-center justify-between px-4 md:px-6">
          <nav className="flex space-x-4 -mb-px">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              )
            })}
          </nav>
          {/* Desktop rightContent */}
          {rightContent && (
            <div className="flex items-center -mb-px">
              {rightContent}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default variant (underline)
  return (
    <div className={cn('border-b border-border', className)}>
      <nav className="flex space-x-4 -mb-px overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                isActive
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// Hook para leer el tab activo desde URL
export function useActiveTab(paramName = 'tab', defaultTab?: string) {
  const searchParams = useSearchParams()
  return searchParams.get(paramName) || defaultTab
}
