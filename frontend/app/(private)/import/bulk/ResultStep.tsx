'use client'

import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, CheckCircle2, Upload } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import type { ImportResult } from '@/lib/apiClient'

interface ResultStepProps {
  result: ImportResult
  onRestart: () => void
}

export function ResultStep({ result, onRestart }: ResultStepProps) {
  const router = useRouter()
  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-transparent shadow-sm dark:shadow-premium bg-white dark:bg-layer-1">
      <CardContent className="py-12 px-4 sm:px-8 text-center space-y-8">
        <div className="h-20 w-20 rounded-3xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
        <h3 className="text-2xl font-black text-text-primary tracking-tight">
          Importación completada
        </h3>

        <dl className="max-w-md mx-auto grid grid-cols-3 gap-4 p-6 rounded-3xl bg-layer-2/50 border border-layer-3">
          <div>
            <dt className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
              Leídos
            </dt>
            <dd className="text-2xl font-black text-text-primary tabular-nums">{result.total}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
              Guardados
            </dt>
            <dd className="text-2xl font-black text-success tabular-nums">{result.inserted}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
              Ya estaban
            </dt>
            <dd className="text-2xl font-black text-text-primary tabular-nums">{result.skipped}</dd>
          </div>
        </dl>

        {result.errors.length > 0 && (
          <div
            role="alert"
            className="max-w-md mx-auto p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-left flex gap-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <ul className="space-y-1">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3 max-w-md mx-auto">
          <Button className="h-12 w-full font-bold" onClick={() => router.push('/transactions')}>
            Ir a transacciones
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button variant="outline" className="h-11 w-full" onClick={onRestart}>
            <Upload className="h-4 w-4 mr-2" />
            Importar otro archivo
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
