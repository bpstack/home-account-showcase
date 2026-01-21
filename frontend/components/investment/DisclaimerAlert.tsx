// components/investment/DisclaimerAlert.tsx
// Disclaimer alert component for investment module

'use client'

import { AlertCircle, X } from 'lucide-react'
import { useDisclaimersStore } from '@/stores/disclaimersStore'
import { cn } from '@/lib/utils'

interface DisclaimerAlertProps {
  className?: string
  variant?: 'default' | 'compact'
  type?: 'recommendations' | 'chat'
}

export function DisclaimerAlert({ className = '', variant = 'default', type = 'recommendations' }: DisclaimerAlertProps) {
  const store = useDisclaimersStore()
  const isVisible = type === 'recommendations' ? store.showRecommendations : store.showChat
  
  if (!isVisible) return null

  const content = type === 'chat' ? (
    <p className="text-xs">⚠️ Esta información es educativa y no constituye asesoramiento financiero. Consulta un profesional antes de invertir.</p>
  ) : (
    <>
      <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">⚠️ Aviso importante</p>
      <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-200">
        <li>Recomendaciones basadas en IA son subjetivas</li>
        <li>No constituyen asesoramiento financiero profesional</li>
        <li>Mercados impredecibles; rentabilidades pasadas no garantizan resultados</li>
        <li>Consulta un profesional antes de invertir</li>
        <li>Solo invierte dinero que puedas permitirte perder</li>
      </ul>
    </>
  )

  const padding = variant === 'compact' ? 'p-2' : 'p-3'
  const iconSize = variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <div className={cn(
      'flex items-start gap-2 rounded-lg text-xs',
      padding,
      'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800',
      className
    )}>
      <AlertCircle className={cn(iconSize, 'mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400')} />
      <div className="flex-1">{content}</div>
      <button
        onClick={store.toggle}
        className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
