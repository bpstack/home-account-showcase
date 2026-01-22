'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface Tab {
  id: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  paramName?: string
  className?: string
  variant?: 'default' | 'pills'
}

export function Tabs({
  tabs,
  defaultTab,
  paramName = 'tab',
  className,
  variant = 'default',
}: TabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get(paramName) || defaultTab || tabs[0]?.id

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramName, tabId)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

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
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    )
  }

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
                'whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                isActive
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export function useActiveTab(paramName = 'tab', defaultTab?: string) {
  const searchParams = useSearchParams()
  return searchParams.get(paramName) || defaultTab
}
