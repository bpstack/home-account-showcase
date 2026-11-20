// Types for reading bank statements in the browser. Nothing here leaves the user's device.

/** What a column of the statement holds. */
export type ColumnRole =
  | 'date'
  | 'description'
  | 'amount' // one signed column: negative is an expense
  | 'debit' // expenses only (cargo, debe, gasto)
  | 'credit' // income only (abono, haber, ingreso)
  | 'category'
  | 'subcategory'

/** Column index for each role found in the statement. */
export type ColumnMap = Partial<Record<ColumnRole, number>>

/** A spreadsheet as rows of raw cell values (numbers for Excel cells, strings for CSV). */
export type Rows = unknown[][]

export interface DetectedLayout {
  /** Index in `rows` of the header row, or -1 when none was recognised. */
  headerRowIndex: number
  headers: string[]
  columns: ColumnMap
}

export interface Movement {
  /** 1-based row number in the original file, to point at it in the review screen. */
  row: number
  /** YYYY-MM-DD */
  date: string
  description: string
  /** Negative is an expense, positive is income. */
  amount: number
  category: string | null
  subcategory: string | null
}

export interface RowError {
  /** 1-based row number in the original file. */
  row: number
  reason: string
}

export interface ParsedStatement {
  movements: Movement[]
  errors: RowError[]
}
