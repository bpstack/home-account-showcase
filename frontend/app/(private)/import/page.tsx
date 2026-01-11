'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCategories } from '@/lib/queries/categories'
import { importApi, type ParseResult, type CategoryMapping, type Category } from '@/lib/apiClient'
import { Button, Card, CardContent, Select } from '@/components/ui'
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
  X,
} from 'lucide-react'

type Step = 'upload' | 'preview' | 'mapping' | 'result'

interface MappingState {
  [key: string]: string | null
}

export default function ImportPage() {
  const { account } = useAuth()
  const { data: catData } = useCategories(account?.id || '')
  const categoryList = catData?.categories || []

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [mappings, setMappings] = useState<MappingState>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{
    total: number
    inserted: number
    skipped: number
    errors: string[]
  } | null>(null)

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [])

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)
    setIsLoading(true)

    try {
      const result = await importApi.parse(selectedFile)
      setParseResult(result.data)

      if (result.data.file_type === 'control_gastos' && result.data.available_sheets?.length) {
        setSelectedSheet(result.data.sheet_name || result.data.available_sheets[0])
      }

      if (result.data.success && result.data.transactions.length > 0) {
        initializeMappings(result.data.categories)
        setStep('preview')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSheetChange = async (sheetName: string) => {
    if (!file) return
    setSelectedSheet(sheetName)
    setIsLoading(true)
    setError(null)

    try {
      const result = await importApi.parse(file, sheetName)
      setParseResult(result.data)
      if (result.data.success) {
        initializeMappings(result.data.categories)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const initializeMappings = (fileCategories: { category: string; subcategory: string }[]) => {
    const initialMappings: MappingState = {}

    fileCategories.forEach((fileCat) => {
      const key = `${fileCat.category}|${fileCat.subcategory}`

      // Intentar auto-mapeo por coincidencia de nombres
      let matchedSubcategoryId: string | null = null

      for (const appCat of categoryList) {
        // Comparar nombres de categoría (case-insensitive, trim)
        const catNameMatch =
          appCat.name.toLowerCase().trim() === fileCat.category.toLowerCase().trim()

        if (catNameMatch && appCat.subcategories) {
          // Buscar subcategoría que coincida
          const matchedSub = appCat.subcategories.find(
            (sub) => sub.name.toLowerCase().trim() === fileCat.subcategory.toLowerCase().trim()
          )
          if (matchedSub) {
            matchedSubcategoryId = matchedSub.id
            break
          }
        }

        // También buscar coincidencia parcial en subcategorías
        if (!matchedSubcategoryId && appCat.subcategories) {
          for (const sub of appCat.subcategories) {
            const subNameLower = sub.name.toLowerCase().trim()
            const fileSubLower = fileCat.subcategory.toLowerCase().trim()
            const fileCatLower = fileCat.category.toLowerCase().trim()

            // Match si la subcategoría del archivo contiene el nombre de la app o viceversa
            if (
              subNameLower.includes(fileSubLower) ||
              fileSubLower.includes(subNameLower) ||
              subNameLower.includes(fileCatLower) ||
              fileCatLower.includes(subNameLower)
            ) {
              matchedSubcategoryId = sub.id
              break
            }
          }
        }

        if (matchedSubcategoryId) break
      }

      initialMappings[key] = matchedSubcategoryId
    })

    setMappings(initialMappings)
  }

  // Re-calcular mappings cuando las categorías de la app estén disponibles
  useEffect(() => {
    if (parseResult?.categories && categoryList.length > 0) {
      initializeMappings(parseResult.categories)
    }
  }, [categoryList.length])

  // Estadísticas de mapeo
  const mappingStats = useMemo(() => {
    const total = Object.keys(mappings).length
    const mapped = Object.values(mappings).filter((v) => v !== null).length
    return { total, mapped, pending: total - mapped }
  }, [mappings])

  const handleMappingChange = (key: string, subcategoryId: string | null) => {
    setMappings((prev) => ({ ...prev, [key]: subcategoryId }))
  }

  const handleConfirmImport = async () => {
    if (!account || !parseResult) return

    setIsLoading(true)
    setError(null)

    try {
      const categoryMappings: CategoryMapping[] = Object.entries(mappings).map(
        ([key, subcategory_id]) => {
          const [bank_category, bank_subcategory] = key.split('|')
          return { bank_category, bank_subcategory, subcategory_id }
        }
      )

      const result = await importApi.confirm({
        account_id: account.id,
        transactions: parseResult.transactions,
        category_mappings: categoryMappings,
      })

      setImportResult(result.data)
      setStep('result')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetImport = () => {
    setStep('upload')
    setFile(null)
    setParseResult(null)
    setSelectedSheet('')
    setMappings({})
    setError(null)
    setImportResult(null)
  }

  const getSubcategoryOptions = (categoryList: Category[]) => {
    const options: { value: string; label: string }[] = [{ value: '', label: 'Sin asignar' }]

    categoryList.forEach((cat) => {
      if (cat.subcategories) {
        cat.subcategories.forEach((sub) => {
          options.push({
            value: sub.id,
            label: `${cat.name} → ${sub.name}`,
          })
        })
      }
    })

    return options
  }

  const subcategoryOptions = getSubcategoryOptions(categoryList)

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Importar Transacciones</h1>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {(['upload', 'preview', 'mapping', 'result'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-accent text-white'
                  : i < ['upload', 'preview', 'mapping', 'result'].indexOf(step)
                    ? 'bg-success text-white'
                    : 'bg-layer-2 text-text-secondary'
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <div
                className={`w-8 h-0.5 ${
                  i < ['upload', 'preview', 'mapping', 'result'].indexOf(step)
                    ? 'bg-success'
                    : 'bg-layer-3'
                }`}
              />
            )}
          </div>
        ))}
        <div className="ml-4 text-sm text-text-secondary">
          {step === 'upload' && 'Subir archivo'}
          {step === 'preview' && 'Vista previa'}
          {step === 'mapping' && 'Mapear categorías'}
          {step === 'result' && 'Resultado'}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-danger">Error</p>
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
        </div>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <Card>
          <CardContent className="py-12">
            <div
              className="border-2 border-dashed border-layer-3 rounded-xl p-12 text-center hover:border-accent/50 transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 text-accent animate-spin" />
                  <p className="text-text-secondary">Procesando archivo...</p>
                </div>
              ) : (
                <>
                  <FileSpreadsheet className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                  <p className="text-text-primary font-medium mb-2">
                    Arrastra tu archivo Excel aquí
                  </p>
                  <p className="text-sm text-text-secondary mb-4">o haz clic para seleccionar</p>
                  <p className="text-xs text-text-secondary">
                    Soporta: Control de Gastos (.xlsx) y Movimientos CC (.xls)
                  </p>
                </>
              )}
              <input
                id="file-input"
                type="file"
                accept=".xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelect(f)
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === 'preview' && parseResult && (
        <div className="space-y-6">
          {/* File info */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-accent" />
                  <div>
                    <p className="font-medium text-text-primary">{file?.name}</p>
                    <p className="text-sm text-text-secondary">
                      Tipo:{' '}
                      {parseResult.file_type === 'control_gastos'
                        ? 'Control de Gastos'
                        : 'Movimientos CC'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={resetImport}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Sheet selector for Control de Gastos */}
              {parseResult.file_type === 'control_gastos' && parseResult.available_sheets && (
                <div className="mt-4">
                  <Select
                    label="Hoja del mes"
                    options={parseResult.available_sheets.map((s) => ({ value: s, label: s }))}
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transactions preview */}
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b border-layer-3">
                <h3 className="font-medium text-text-primary">
                  Vista previa ({parseResult.transactions.length} transacciones)
                </h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-layer-1 sticky top-0">
                    <tr className="border-b border-layer-3">
                      <th className="text-left py-2 px-4 text-text-secondary font-medium">Fecha</th>
                      <th className="text-left py-2 px-4 text-text-secondary font-medium">
                        Descripción
                      </th>
                      <th className="text-left py-2 px-4 text-text-secondary font-medium">
                        Categoría
                      </th>
                      <th className="text-right py-2 px-4 text-text-secondary font-medium">
                        Importe
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.transactions.slice(0, 50).map((tx, i) => (
                      <tr key={i} className="border-b border-layer-2 hover:bg-layer-1">
                        <td className="py-2 px-4 text-text-primary">{tx.date}</td>
                        <td className="py-2 px-4 text-text-primary truncate max-w-[200px]">
                          {tx.description}
                        </td>
                        <td className="py-2 px-4">
                          <span className="text-xs text-text-secondary">
                            {tx.bank_category}
                            {tx.bank_subcategory && ` → ${tx.bank_subcategory}`}
                          </span>
                        </td>
                        <td
                          className={`py-2 px-4 text-right font-medium ${
                            tx.amount >= 0 ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {tx.amount >= 0 ? '+' : ''}
                          {tx.amount.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parseResult.transactions.length > 50 && (
                  <div className="p-4 text-center text-sm text-text-secondary bg-layer-1">
                    ... y {parseResult.transactions.length - 50} transacciones más
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetImport}>
              Cancelar
            </Button>
            <Button onClick={() => setStep('mapping')}>
              Siguiente: Mapear categorías
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Mapping */}
      {step === 'mapping' && parseResult && (
        <div className="space-y-6">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-text-primary">Mapeo de categorías</h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-success">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    {mappingStats.mapped} mapeadas
                  </span>
                  {mappingStats.pending > 0 && (
                    <span className="text-warning">{mappingStats.pending} sin asignar</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-text-secondary">
                Se han mapeado automáticamente las categorías coincidentes. Puedes modificar
                cualquier asignación manualmente.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-layer-2">
                {parseResult.categories.map((cat) => {
                  const key = `${cat.category}|${cat.subcategory}`
                  const isMapped = mappings[key] !== null
                  return (
                    <div
                      key={key}
                      className={`p-4 flex items-center gap-4 ${
                        isMapped ? 'bg-success/5' : 'bg-warning/5'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isMapped ? 'bg-success' : 'bg-warning'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">{cat.category}</p>
                        {cat.subcategory && (
                          <p className="text-sm text-text-secondary truncate">{cat.subcategory}</p>
                        )}
                      </div>
                      <ArrowRight
                        className={`h-4 w-4 flex-shrink-0 ${
                          isMapped ? 'text-success' : 'text-text-secondary'
                        }`}
                      />
                      <div className="w-72">
                        <Select
                          options={subcategoryOptions}
                          value={mappings[key] || ''}
                          onChange={(e) => handleMappingChange(key, e.target.value || null)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep('preview')}>
              Atrás
            </Button>
            <Button onClick={handleConfirmImport} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {parseResult.transactions.length} transacciones
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && importResult && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text-primary mb-2">Importación completada</h2>
            <div className="space-y-1 mb-6">
              <p className="text-text-secondary">
                <span className="font-medium text-success">{importResult.inserted}</span>{' '}
                transacciones importadas
              </p>
              {importResult.skipped > 0 && (
                <p className="text-text-secondary">
                  <span className="font-medium text-warning">{importResult.skipped}</span>{' '}
                  transacciones omitidas
                </p>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="mb-6 p-4 bg-warning/10 rounded-lg text-left">
                <p className="font-medium text-warning mb-2">Errores:</p>
                <ul className="text-sm text-text-secondary space-y-1">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={resetImport}>
                Importar más
              </Button>
              <Button onClick={() => (window.location.href = '/transactions')}>
                Ver transacciones
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
