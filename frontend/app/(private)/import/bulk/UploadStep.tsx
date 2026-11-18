'use client'

import { useState } from 'react'
import { AlertCircle, Database, Loader2, Lock, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { MAX_FILE_BYTES, readStatement, type Rows } from '@/lib/import'

interface UploadStepProps {
  onRead: (fileName: string, rows: Rows) => void
}

/** Reads the statement in the browser: the file never leaves the device. */
export function UploadStep({ onRead }: UploadStepProps) {
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so choosing the same file again fires onChange
    if (!file) return

    setError(null)
    if (file.size > MAX_FILE_BYTES) {
      setError('El archivo es demasiado grande. El tamaño máximo es 5 MB')
      return
    }

    setIsReading(true)
    let rows: Rows | null = null
    try {
      rows = readStatement(new Uint8Array(await file.arrayBuffer()))
    } catch {
      setError('No se pudo leer el archivo. Comprueba que es un Excel (.xls, .xlsx) o un CSV')
    }
    setIsReading(false)

    if (!rows) return
    if (rows.length === 0) {
      setError('El archivo no tiene filas')
      return
    }
    onRead(file.name, rows)
  }

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-transparent shadow-sm dark:shadow-premium bg-white dark:bg-layer-1">
      <CardHeader className="pb-4 pt-4 sm:pb-6 sm:pt-6 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Database className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-xl font-bold tracking-tight text-slate-800 dark:text-text-primary truncate">
              Importación masiva
            </CardTitle>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-text-secondary mt-0.5 hidden sm:block">
              Sube el extracto de tu banco para importar sus movimientos.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-8">
        <label className="relative group cursor-pointer block">
          <input
            type="file"
            className="hidden"
            accept=".xls,.xlsx,.csv"
            onChange={handleFile}
            disabled={isReading}
          />
          <div className="py-8 sm:py-16 flex flex-col items-center justify-center border-2 border-dashed border-emerald-300 dark:border-emerald-500/20 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/[0.02] group-hover:bg-emerald-100/50 dark:group-hover:bg-emerald-500/[0.05] group-hover:border-emerald-400 dark:group-hover:border-emerald-500/40 transition-all duration-300 ease-out text-center">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-emerald-100 dark:bg-accent/10 flex items-center justify-center mb-3 sm:mb-4 border border-emerald-200 dark:border-accent/10">
              {isReading ? (
                <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 dark:text-accent animate-spin" />
              ) : (
                <Upload className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 dark:text-accent" />
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-text-primary mb-2">
              {isReading ? 'Leyendo el archivo…' : 'Elige el extracto de tu banco'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-text-secondary max-w-sm px-4 mb-4 leading-relaxed">
              Excel (.xls, .xlsx) o CSV, de hasta 5 MB.
            </p>
            <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-layer-2 border border-slate-200 dark:border-layer-3 text-xs font-medium text-slate-600 dark:text-text-secondary">
              <Lock className="h-3.5 w-3.5" />
              Se lee en tu navegador y se guarda cifrado
            </p>
          </div>
        </label>

        {error && (
          <div
            role="alert"
            className="mt-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
