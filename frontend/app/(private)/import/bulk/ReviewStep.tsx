'use client'

import Link from 'next/link'
import { AlertCircle, ArrowLeft, Columns3, Layers, Lock, TableProperties } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Select } from '@/components/ui'
import type { ColumnMap, ColumnRole, Movement, ParsedStatement, RowError } from '@/lib/import'

/** One bank category pair found in the statement, with the subcategory currently chosen. */
export interface BankPair {
  key: string
  category: string | null
  subcategory: string | null
  count: number
  subcategoryId: string | null
}

interface ReviewStepProps {
  fileName: string
  headers: string[]
  columns: ColumnMap
  onColumnsChange: (columns: ColumnMap) => void
  parsed: ParsedStatement
  /** For each movement, whether it is already imported; null while unknown (or account locked) */
  duplicates: boolean[] | null
  pairs: BankPair[]
  subcategoryOptions: { value: string; label: string }[]
  onChoiceChange: (pairKey: string, subcategoryId: string | null) => void
  isLocked: boolean
  isImporting: boolean
  error: string | null
  onConfirm: () => void
  onBack: () => void
}

const ROLE_OPTIONS: { value: ColumnRole | ''; label: string }[] = [
  { value: '', label: 'No usar' },
  { value: 'date', label: 'Fecha' },
  { value: 'description', label: 'Concepto' },
  { value: 'amount', label: 'Importe (con signo)' },
  { value: 'debit', label: 'Cargo (gastos)' },
  { value: 'credit', label: 'Abono (ingresos)' },
  { value: 'category', label: 'Categoría del banco' },
  { value: 'subcategory', label: 'Subcategoría del banco' },
]

const PREVIEW_ROWS = 20
const ERROR_ROWS = 20

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

/** What is still missing for the columns to describe a movement, in words. */
function missingRoles(columns: ColumnMap): string[] {
  const missing: string[] = []
  if (columns.date === undefined) missing.push('la fecha')
  if (columns.description === undefined) missing.push('el concepto')
  if (columns.amount === undefined && columns.debit === undefined && columns.credit === undefined) {
    missing.push('el importe')
  }
  return missing
}

/** Assigns `role` to column `index`, taking it away from any other column. */
function assignRole(columns: ColumnMap, index: number, role: ColumnRole | ''): ColumnMap {
  const next: ColumnMap = {}
  for (const [r, i] of Object.entries(columns) as [ColumnRole, number][]) {
    if (i !== index && r !== role) next[r] = i
  }
  if (role) next[role] = index
  return next
}

function roleAt(columns: ColumnMap, index: number): ColumnRole | '' {
  const found = (Object.entries(columns) as [ColumnRole, number][]).find(([, i]) => i === index)
  return found ? found[0] : ''
}

function ColumnsPanel({
  headers,
  columns,
  onChange,
}: {
  headers: string[]
  columns: ColumnMap
  onChange: (columns: ColumnMap) => void
}) {
  const missing = missingRoles(columns)
  return (
    <section aria-labelledby="import-columns" className="space-y-3">
      <h3
        id="import-columns"
        className="flex items-center gap-2 text-sm font-bold text-text-primary"
      >
        <Columns3 className="h-4 w-4 text-accent" />
        Columnas
      </h3>
      <p className="text-xs text-text-secondary">
        Las hemos reconocido por su nombre. Corrige las que no estén bien.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {headers.map((header, index) => (
          <Select
            key={index}
            id={`import-column-${index}`}
            label={header || `Columna ${index + 1}`}
            options={ROLE_OPTIONS}
            value={roleAt(columns, index)}
            onChange={(e) =>
              onChange(assignRole(columns, index, e.target.value as ColumnRole | ''))
            }
          />
        ))}
      </div>
      {missing.length > 0 && (
        <p role="alert" className="text-sm font-medium text-warning">
          Falta indicar qué columna tiene {missing.join(', ')}.
        </p>
      )}
    </section>
  )
}

function RowErrorsPanel({ errors }: { errors: RowError[] }) {
  if (errors.length === 0) return null
  return (
    <section aria-labelledby="import-row-errors" className="space-y-2">
      <h3
        id="import-row-errors"
        className="flex items-center gap-2 text-sm font-bold text-text-primary"
      >
        <AlertCircle className="h-4 w-4 text-warning" />
        {errors.length === 1
          ? '1 fila no se ha podido leer'
          : `${errors.length} filas no se han podido leer`}
      </h3>
      <p className="text-xs text-text-secondary">No se importarán. Revísalas en tu archivo.</p>
      <ul className="max-h-48 overflow-y-auto rounded-xl border border-layer-3 divide-y divide-layer-2 text-sm">
        {errors.slice(0, ERROR_ROWS).map((e) => (
          <li key={e.row} className="px-3 py-2 flex gap-3">
            <span className="shrink-0 font-semibold tabular-nums text-text-primary">
              Fila {e.row}
            </span>
            <span className="text-text-secondary">{e.reason}</span>
          </li>
        ))}
      </ul>
      {errors.length > ERROR_ROWS && (
        <p className="text-xs text-text-secondary">y {errors.length - ERROR_ROWS} más.</p>
      )}
    </section>
  )
}

function PreviewPanel({
  movements,
  duplicates,
}: {
  movements: Movement[]
  duplicates: boolean[] | null
}) {
  if (movements.length === 0) return null
  return (
    <section aria-labelledby="import-preview" className="space-y-2">
      <h3
        id="import-preview"
        className="flex items-center gap-2 text-sm font-bold text-text-primary"
      >
        <TableProperties className="h-4 w-4 text-accent" />
        Movimientos
      </h3>
      <div className="max-h-[420px] overflow-auto rounded-xl border border-layer-3">
        <table className="w-full text-sm">
          <thead className="bg-layer-2/50 sticky top-0">
            <tr className="text-left text-[10px] uppercase tracking-wider text-text-secondary">
              <th scope="col" className="p-3">
                Fecha
              </th>
              <th scope="col" className="p-3">
                Concepto
              </th>
              <th scope="col" className="p-3 hidden md:table-cell">
                Categoría del banco
              </th>
              <th scope="col" className="p-3 text-right">
                Importe
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-layer-2">
            {movements.slice(0, PREVIEW_ROWS).map((m, i) => (
              <tr key={m.row} className={duplicates?.[i] ? 'opacity-60' : undefined}>
                <td className="p-3 whitespace-nowrap tabular-nums">{m.date}</td>
                <td className="p-3 max-w-[260px]">
                  <span className="block truncate">{m.description}</span>
                  {duplicates?.[i] && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-layer-2 text-[10px] font-bold uppercase text-text-secondary">
                      Ya importado
                    </span>
                  )}
                </td>
                <td className="p-3 hidden md:table-cell text-text-secondary">
                  {[m.category, m.subcategory].filter(Boolean).join(' → ') || '—'}
                </td>
                <td
                  className={`p-3 text-right font-semibold tabular-nums whitespace-nowrap ${m.amount > 0 ? 'text-success' : 'text-danger'}`}
                >
                  {euros.format(m.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {movements.length > PREVIEW_ROWS && (
        <p className="text-xs text-text-secondary">
          Se muestran {PREVIEW_ROWS} de {movements.length}. Se importarán todos.
        </p>
      )}
    </section>
  )
}

function CategoriesPanel({
  pairs,
  options,
  onChange,
}: {
  pairs: BankPair[]
  options: { value: string; label: string }[]
  onChange: (pairKey: string, subcategoryId: string | null) => void
}) {
  if (pairs.length === 0) return null
  const pending = pairs.filter((p) => !p.subcategoryId).length
  return (
    <section aria-labelledby="import-categories" className="space-y-3">
      <h3
        id="import-categories"
        className="flex items-center gap-2 text-sm font-bold text-text-primary"
      >
        <Layers className="h-4 w-4 text-accent" />
        Categorías
      </h3>
      <p className="text-xs text-text-secondary">
        Elige en qué subcategoría van los movimientos de cada categoría del banco. Lo recordaremos
        para la próxima vez.
        {pending > 0 && ` Sin asignar: ${pending}.`}
      </p>
      <div className="grid grid-cols-1 gap-3">
        {pairs.map((pair, i) => (
          <Select
            key={pair.key}
            id={`import-category-${i}`}
            label={`${[pair.category, pair.subcategory].filter(Boolean).join(' → ') || 'Sin categoría del banco'} (${pair.count})`}
            options={options}
            value={pair.subcategoryId ?? ''}
            onChange={(e) => onChange(pair.key, e.target.value || null)}
          />
        ))}
      </div>
    </section>
  )
}

function movements(n: number): string {
  return n === 1 ? '1 movimiento' : `${n} movimientos`
}

/** Single review screen: columns, unreadable rows, movements and categories. */
export function ReviewStep(props: ReviewStepProps) {
  const { parsed, duplicates, isLocked, isImporting } = props
  const count = parsed.movements.length
  const duplicateCount = duplicates ? duplicates.filter(Boolean).length : 0
  const newCount = count - duplicateCount
  const canImport = newCount > 0 && !isLocked && !isImporting

  let buttonLabel = `Importar ${movements(count)}`
  if (duplicates && duplicateCount > 0) {
    buttonLabel =
      newCount === 0
        ? 'Ya estaban todos importados'
        : newCount === 1
          ? 'Importar 1 movimiento nuevo'
          : `Importar ${newCount} movimientos nuevos`
  }

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-transparent shadow-sm dark:shadow-premium bg-white dark:bg-layer-1">
      <CardHeader className="pb-4 pt-4 px-4 sm:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={props.onBack}
            aria-label="Elegir otro archivo"
            className="h-8 w-8 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <CardTitle className="text-base font-bold text-text-primary truncate">
              {props.fileName}
            </CardTitle>
            <p className="text-xs text-text-secondary mt-0.5">
              {count === 1 ? '1 movimiento leído' : `${count} movimientos leídos`}
              {duplicateCount > 0 &&
                ` · ${duplicateCount === 1 ? '1 ya importado' : `${duplicateCount} ya importados`}, no se volverán a guardar`}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-8 space-y-8 border-t border-layer-3">
        <ColumnsPanel
          headers={props.headers}
          columns={props.columns}
          onChange={props.onColumnsChange}
        />
        <RowErrorsPanel errors={parsed.errors} />
        <PreviewPanel movements={parsed.movements} duplicates={duplicates} />
        <CategoriesPanel
          pairs={props.pairs}
          options={props.subcategoryOptions}
          onChange={props.onChoiceChange}
        />

        {isLocked && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-warning/10 border border-warning/20 text-sm flex items-center gap-3"
          >
            <Lock className="h-5 w-5 shrink-0 text-warning" />
            <span className="text-text-primary">
              La cuenta está bloqueada. Los movimientos se guardan cifrados con tu PIN:{' '}
              <Link href="/unlock" className="font-semibold text-accent hover:underline">
                desbloquéala
              </Link>{' '}
              para importar.
            </span>
          </div>
        )}

        {props.error && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            {props.error}
          </div>
        )}

        <Button
          className="h-12 w-full text-base font-semibold"
          onClick={props.onConfirm}
          disabled={!canImport}
          isLoading={isImporting}
        >
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  )
}
