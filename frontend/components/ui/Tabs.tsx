'use client'

import { useCallback, type ReactNode } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

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
  onChange?: (_tabId: string) => void
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

  // Determinar tab activo: controlado > URL > default > primer tab
  const activeTab =
    controlledActiveTab ??
    (!onChange ? searchParams.get(paramName) : null) ??
    defaultTab ??
    tabs[0]?.id

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (onChange) {
        onChange(tabId)
      } else {
        const params = new URLSearchParams(searchParams.toString())
        params.set(paramName, tabId)
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
      }
    },
    [onChange, paramName, searchParams, router, pathname]
  )

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
                  ? 'bg-layer-1 text-text-primary shadow-sm'
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

  // Underline responsive variant: the same tabs on every width (scrolling sideways if they do not
  // fit) and the page's extra control (the period) beside them, or below them on phones
  if (variant === 'underline-responsive') {
    return (
      <div
        className={cn(
          'flex flex-col gap-1 border-b border-layer-3 bg-layer-1 px-4 md:flex-row md:items-center md:justify-between md:px-6',
          className
        )}
      >
        <nav className="-mb-px flex gap-4 overflow-x-auto" aria-label="Vistas">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  isActive
                    ? 'border-accent font-medium text-text-primary'
                    : 'border-transparent text-text-secondary hover:border-layer-3 hover:text-text-primary'
                )}
              >
                {tab.icon && <span className="hidden sm:inline-flex">{tab.icon}</span>}
                {tab.label}
              </button>
            )
          })}
        </nav>
        {rightContent && <div className="-ml-2 pb-2 md:ml-0 md:pb-0">{rightContent}</div>}
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
                  ? 'border-accent text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-layer-3'
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
