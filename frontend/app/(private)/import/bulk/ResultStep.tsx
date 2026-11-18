'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui'
import type { ImportResult } from '@/lib/apiClient'

interface ResultStepProps {
  result: ImportResult
  onRestart: () => void
}

export function ResultStep({ result, onRestart }: ResultStepProps) {
  const router = useRouter()
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-medium text-text-primary">Importación completada</h2>

      <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-layer-3 py-4">
        <div>
          <dt className="text-sm text-text-secondary">Leídas</dt>
          <dd className="mt-1 text-xl font-medium tabular-nums text-text-primary">
            {result.total}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-text-secondary">Guardadas</dt>
          <dd className="mt-1 text-xl font-medium tabular-nums text-success">{result.inserted}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-secondary">Ya estaban</dt>
          <dd className="mt-1 text-xl font-medium tabular-nums text-text-primary">
            {result.skipped}
          </dd>
        </div>
      </dl>

      {result.errors.length > 0 && (
        <ul
          role="alert"
          className="mt-6 space-y-1 rounded-lg border border-danger/30 bg-danger/10 p-3 text-left text-sm text-danger"
        >
          {result.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
        <Button onClick={() => router.push('/transactions')}>Ver las transacciones</Button>
        <Button variant="outline" onClick={onRestart}>
          Importar otro archivo
        </Button>
      </div>
    </div>
  )
}
