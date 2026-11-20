import { cn } from '@/lib/utils'

/** The one line that goes under anything written by the AI. It cannot be hidden. */
export function AiNote({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs text-text-secondary', className)}>
      Orientativo y generado con IA: no es asesoramiento financiero. Antes de invertir, consulta a
      un profesional.
    </p>
  )
}
