// Turning the rows under the header into movements. A row that cannot be read is never dropped in
// silence: it comes back in `errors` with its row number and the reason.

import {
  cleanText,
  detectDateOrder,
  detectDecimalSeparator,
  parseAmount,
  parseDate,
} from './values'
import type { ColumnMap, Movement, ParsedStatement, RowError, Rows } from './types'

function cell(row: unknown[], index: number | undefined): unknown {
  return index === undefined ? undefined : row[index]
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || cleanText(value) === ''
}

/**
 * Reads the movements under the header.
 * @param rows every row of the sheet
 * @param headerRowIndex index of the header row in `rows` (-1 when the data starts at row 0)
 */
export function parseMovements(
  rows: Rows,
  headerRowIndex: number,
  columns: ColumnMap
): ParsedStatement {
  const dataRows = rows.slice(headerRowIndex + 1)
  const firstRowNumber = headerRowIndex + 2 // 1-based number of the first data row

  // Formats are decided once per column, looking at all its values
  const dateOrder = detectDateOrder(dataRows.map((row) => cell(row, columns.date)))
  const decimalOf = (index: number | undefined) =>
    detectDecimalSeparator(dataRows.map((row) => cell(row, index)))
  const amountDecimal = decimalOf(columns.amount)
  const debitDecimal = decimalOf(columns.debit)
  const creditDecimal = decimalOf(columns.credit)

  const movements: Movement[] = []
  const errors: RowError[] = []

  dataRows.forEach((row, offset) => {
    const rowNumber = firstRowNumber + offset
    const rawDate = cell(row, columns.date)
    const rawDescription = cell(row, columns.description)
    const rawAmounts = [columns.amount, columns.debit, columns.credit].map((i) => cell(row, i))

    // Empty rows and footer lines without date or amount (totals, notes) are not movements
    if (row.every(isBlank)) return
    if (isBlank(rawDate) && rawAmounts.every(isBlank)) return

    const date = parseDate(rawDate, dateOrder)
    if (!date) {
      errors.push({ row: rowNumber, reason: `Fecha no válida: «${cleanText(rawDate)}»` })
      return
    }

    const description = cleanText(rawDescription)
    if (!description) {
      errors.push({ row: rowNumber, reason: 'Sin concepto' })
      return
    }

    let amount: number | null
    if (columns.amount !== undefined) {
      amount = parseAmount(rawAmounts[0], amountDecimal)
    } else {
      const debit = parseAmount(rawAmounts[1], debitDecimal)
      const credit = parseAmount(rawAmounts[2], creditDecimal)
      // A debit column may hold positive or negative numbers: it is always an expense
      amount = debit === null && credit === null ? null : (credit ?? 0) - Math.abs(debit ?? 0)
    }
    if (amount === null) {
      const shown = rawAmounts
        .filter((value) => !isBlank(value))
        .map(cleanText)
        .join(' / ')
      errors.push({ row: rowNumber, reason: `Importe no válido: «${shown}»` })
      return
    }
    if (amount === 0) {
      errors.push({ row: rowNumber, reason: 'Importe cero' })
      return
    }

    const category = cleanText(cell(row, columns.category)) || null
    const subcategory = cleanText(cell(row, columns.subcategory)) || null
    movements.push({
      row: rowNumber,
      date,
      description,
      amount: Math.round(amount * 100) / 100,
      category,
      subcategory,
    })
  })

  return { movements, errors }
}
