// Statement import, read in the browser. See docs/import-redesign.md (outside git).

import { detectLayout, isComplete } from './columns'
import { parseMovements } from './parse'
import { readStatement } from './read'
import type { ColumnMap, DetectedLayout, ParsedStatement, Rows } from './types'

export { detectLayout, isComplete, layoutSignature, mapColumns, roleOf } from './columns'
export { parseMovements } from './parse'
export { MAX_FILE_BYTES, readStatement } from './read'
export type * from './types'

export interface StatementPreview {
  rows: Rows
  layout: DetectedLayout
  /** Empty until the columns are complete (date, description and an amount). */
  parsed: ParsedStatement
}

/** Reads a file and, when its columns are recognised, its movements. */
export function previewStatement(bytes: Uint8Array): StatementPreview {
  const rows = readStatement(bytes)
  const layout = detectLayout(rows)
  return { rows, layout, parsed: parseWithColumns(rows, layout.headerRowIndex, layout.columns) }
}

/** Re-reads the movements after the user changes the column assignment. */
export function parseWithColumns(
  rows: Rows,
  headerRowIndex: number,
  columns: ColumnMap
): ParsedStatement {
  return isComplete(columns)
    ? parseMovements(rows, headerRowIndex, columns)
    : { movements: [], errors: [] }
}
