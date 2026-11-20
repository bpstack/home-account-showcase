// Finding the header row and guessing what each column holds, from its name.

import type { ColumnMap, ColumnRole, DetectedLayout, Rows } from './types'

/** Lower case, no accents, punctuation turned into spaces: "F. VALOR" → "f valor". */
export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Names banks use for each role, already normalised. A header matches when it equals one of
// these or starts with it followed by more words ("importe eur", "fecha valor").
// Order matters: the first role that matches wins, so the specific ones go first.
const SYNONYMS: [ColumnRole, string[]][] = [
  ['subcategory', ['subcategoria', 'subcategory', 'sub categoria']],
  ['category', ['categoria', 'category', 'tipo de movimiento', 'tipo movimiento']],
  [
    'date',
    [
      'fecha',
      'f valor',
      'f operacion',
      'f contable',
      'fecha valor',
      'fecha operacion',
      'fecha contable',
      'date',
      'value date',
      'booking date',
      'transaction date',
      'started date',
      'completed date',
    ],
  ],
  [
    'description',
    [
      'concepto',
      'descripcion',
      'detalle',
      'movimiento',
      'description',
      'concept',
      'details',
      'payee',
      'beneficiario',
    ],
  ],
  ['debit', ['cargo', 'cargos', 'debe', 'gasto', 'gastos', 'debit', 'retirada', 'salida']],
  ['credit', ['abono', 'abonos', 'haber', 'ingreso', 'ingresos', 'credit', 'entrada']],
  ['amount', ['importe', 'cantidad', 'amount', 'monto', 'valor']],
]

// Words that mark a column as the running balance, which must never be imported as the amount,
// wherever they appear in the name ("Saldo", "Importe saldo", "Available balance").
const NEVER = ['saldo', 'balance', 'disponible']

function matches(header: string, name: string): boolean {
  return header === name || header.startsWith(`${name} `)
}

/** The role a header name suggests, or null. */
export function roleOf(header: unknown): ColumnRole | null {
  const normalized = normalizeHeader(header)
  const words = normalized.split(' ')
  if (!normalized || NEVER.some((word) => words.includes(word))) return null
  for (const [role, names] of SYNONYMS) {
    if (names.some((name) => matches(normalized, name))) return role
  }
  return null
}

/** Maps each role to the first column whose header suggests it. */
export function mapColumns(headers: unknown[]): ColumnMap {
  const columns: ColumnMap = {}
  headers.forEach((header, index) => {
    const role = roleOf(header)
    if (role && columns[role] === undefined) columns[role] = index
  })
  return columns
}

/** True when the map has what a movement needs: a date, a description and an amount. */
export function isComplete(columns: ColumnMap): boolean {
  const hasAmount =
    columns.amount !== undefined || columns.debit !== undefined || columns.credit !== undefined
  return columns.date !== undefined && columns.description !== undefined && hasAmount
}

const HEADER_SEARCH_ROWS = 30

/**
 * Finds the header row: among the first rows, the one whose names cover the most roles, preferring
 * one that is complete. Banks often put account details above it.
 */
export function detectLayout(rows: Rows): DetectedLayout {
  let best: DetectedLayout = { headerRowIndex: -1, headers: [], columns: {} }
  let bestScore = 0

  rows.slice(0, HEADER_SEARCH_ROWS).forEach((row, index) => {
    const columns = mapColumns(row)
    const score = Object.keys(columns).length + (isComplete(columns) ? 10 : 0)
    if (score > bestScore) {
      bestScore = score
      best = { headerRowIndex: index, headers: row.map((cell) => String(cell ?? '')), columns }
    }
  })

  // Two recognised names are the minimum to trust a row as the header
  return Object.keys(best.columns).length >= 2
    ? best
    : { headerRowIndex: -1, headers: [], columns: {} }
}

/** Identifies a statement layout by its header names, to remember the user's column choices. */
export function layoutSignature(headers: string[]): string {
  return headers.map(normalizeHeader).join('|')
}
