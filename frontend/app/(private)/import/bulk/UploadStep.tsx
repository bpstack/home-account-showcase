'use client'

import { useState } from 'react'
import { AlertCircle, Loader2, Lock, Upload } from 'lucide-react'
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
    <div className="space-y-4">
      <label className="group block cursor-pointer">
        <input
          type="file"
          className="peer sr-only"
          accept=".xls,.xlsx,.csv"
          onChange={handleFile}
          disabled={isReading}
        />
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-layer-3 bg-layer-1 px-6 py-12 text-center transition-colors group-hover:border-accent peer-focus-visible:border-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ring sm:py-16">
          {isReading ? (
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-accent" aria-hidden="true" />
          ) : (
            <Upload className="mb-3 h-8 w-8 text-accent" aria-hidden="true" />
          )}
          <p className="text-base font-medium text-text-primary">
            {isReading ? 'Leyendo el archivo…' : 'Elige el extracto de tu banco'}
          </p>
          <p className="mt-1 text-sm text-text-secondary">Excel (.xls, .xlsx) o CSV, hasta 5 MB.</p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Se lee en tu navegador y se guarda cifrado
          </p>
        </div>
      </label>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <p className="text-sm text-text-secondary">
        Reconocemos la fecha, el concepto y el importe por el nombre de su columna; si no, los
        eliges tú. ¿Quieres ver un ejemplo?{' '}
        <a href="/templates/import-template.xlsx" download className="text-accent hover:underline">
          Descarga la plantilla
        </a>
        . Si tu banco no se lee bien,{' '}
        <a href="mailto:contact.bstack@gmail.com" className="text-accent hover:underline">
          escríbenos
        </a>
        .
      </p>
    </div>
  )
}
