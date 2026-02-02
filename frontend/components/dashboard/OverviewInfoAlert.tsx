// components/dashboard/OverviewInfoAlert.tsx
// Info alert component for dashboard overview section

'use client'

import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OverviewInfoAlertProps {
  className?: string
}

export function OverviewInfoAlert({ className = '' }: OverviewInfoAlertProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800',
      'bg-blue-50 dark:bg-blue-950/30 px-3 py-2',
      'text-xs text-blue-800 dark:text-blue-200',
      className
    )}>
      <Info className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
      <p>Resumen de ingresos, gastos y balance. Filtra por mes, año o período personalizado.</p>
    </div>
  )
}
