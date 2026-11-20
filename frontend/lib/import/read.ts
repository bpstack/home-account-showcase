// Reading a statement file (.xls, .xlsx, .csv) into rows, in the browser. The file never leaves
// the device: SheetJS parses the bytes locally.

import { read, utils } from 'xlsx'
import type { Rows } from './types'

/** Largest file accepted, in bytes. Bank statements are far smaller. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024

// Binary spreadsheet formats start with these bytes: zip (.xlsx/.ods) and OLE (.xls)
const ZIP = [0x50, 0x4b, 0x03, 0x04]
const OLE = [0xd0, 0xcf, 0x11, 0xe0]

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte)
}

/** Decodes text as UTF-8, or as Windows-1252 when it is not valid UTF-8 (common in Spanish banks). */
export function decodeText(bytes: Uint8Array): string {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    text = new TextDecoder('windows-1252').decode(bytes)
  }
  return text.replace(/^\uFEFF/, '')
}

/** Picks the field separator of a CSV: the one that splits the first lines most consistently. */
export function detectDelimiter(text: string): ',' | ';' | '\t' {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .slice(0, 20)
  let best: ',' | ';' | '\t' = ','
  let bestScore = -1
  for (const candidate of [';', '\t', ','] as const) {
    // Ignore separators inside quotes
    const counts = lines.map((line) => line.replace(/"[^"]*"/g, '').split(candidate).length - 1)
    const max = Math.max(0, ...counts)
    const consistent = counts.filter((count) => count === max).length
    const score = max === 0 ? 0 : consistent * 100 + max
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best
}

function sheetRows(workbook: ReturnType<typeof read>): Rows {
  // The first sheet with data; statements have one
  for (const name of workbook.SheetNames) {
    const rows = utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    })
    if (rows.length > 0) return rows
  }
  return []
}

/**
 * Reads a statement into rows of raw values. Excel cells keep their type (dates as Excel serial
 * numbers, amounts as numbers); CSV cells stay as text so amounts and dates are parsed by
 * `values.ts`, which knows Spanish formats.
 */
export function readStatement(bytes: Uint8Array): Rows {
  if (bytes.length > MAX_FILE_BYTES) {
    throw new Error('El archivo supera el tamaño máximo permitido (5 MB)')
  }
  if (startsWith(bytes, ZIP) || startsWith(bytes, OLE)) {
    return sheetRows(read(bytes, { type: 'array', cellDates: false }))
  }
  // Text: CSV, TSV, or an HTML table saved as .xls by some banks
  const text = decodeText(bytes)
  if (/^\s*</.test(text)) return sheetRows(read(text, { type: 'string', cellDates: false }))
  return sheetRows(read(text, { type: 'string', raw: true, FS: detectDelimiter(text) }))
}
