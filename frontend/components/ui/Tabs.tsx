'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCallback, type ReactNode } from 'react'

export interface Tab {
  id: string
  label: string
  icon?: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeTab?: string
  className?: string
  variant?: 'default' | 'pills'
  /** Nombre del parámetro URL (default: 'tab'). Se ignora si se usa onChange */
  paramName?: string
  /** Tab por defecto si no hay activeTab ni URL param */
  defaultTab?: string
  /** Callback para control directo. Si se proporciona, no se usa URL */
  onChange?: (tabId: string) => void
}

export function Tabs({
  tabs,
  activeTab: controlledActiveTab,
  paramName = 'tab',
  defaultTab,
  onChange,
  className,
  variant = 'default',
}: TabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Determinar tab activo: controlado > URL > default > primer tab
  const activeTab = controlledActiveTab
    ?? (!onChange ? searchParams.get(paramName) : null)
    ?? defaultTab
    ?? tabs[0]?.id

  const handleTabChange = useCallback((tabId: string) => {
    if (onChange) {
      onChange(tabId)
    } else {
      const params = new URLSearchParams(searchParams.toString())
      params.set(paramName, tabId)
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }
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
