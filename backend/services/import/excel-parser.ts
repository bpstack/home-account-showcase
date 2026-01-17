import XLSX from 'xlsx'
import { sanitizeCSVValue } from '../../utils/sanitize.js'

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  bank_category: string | null
  bank_subcategory: string | null
}

export type FileType = 'control_gastos' | 'movimientos_cc' | 'csv_revolut' | 'csv_generic' | 'unknown'

export interface ParseResult {
  success: boolean
  file_type: FileType
  sheet_name?: string
  available_sheets?: string[]
  transactions: ParsedTransaction[]
  categories: { category: string; subcategory: string }[]
  errors: string[]
}

// Required fields for a valid transaction
const REQUIRED_FIELDS = ['date', 'description', 'amount'] as const

function excelDateToISO(serial: number): string {
  const utcDays = Math.floor(serial - 25569)
  const date = new Date(utcDays * 86400 * 1000)
  return date.toISOString().split('T')[0]
}

function parseControlGastos(
  workbook: XLSX.WorkBook,
  sheetName?: string
): ParseResult {
  const monthSheets = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  const availableMonths = workbook.SheetNames.filter((name) =>
    monthSheets.includes(name.trim())
  )

  const targetSheet = sheetName || availableMonths[0]

  if (!targetSheet || !workbook.Sheets[targetSheet]) {
    return {
      success: false,
      file_type: 'control_gastos',
      available_sheets: availableMonths,
      transactions: [],
      categories: [],
      errors: [`Hoja "${sheetName}" no encontrada`],
    }
  }

  const ws = workbook.Sheets[targetSheet]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]

  const transactions: ParsedTransaction[] = []
  const categoriesSet = new Map<string, Set<string>>()
  const errors: string[] = []

  // Find header row (CATEGORÍA, SUBCATEGORÍA, FECHA, DETALLE, IMPORTE)
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i]
    if (
      row &&
      Array.isArray(row) &&
      row.some(
        (cell) =>
          typeof cell === 'string' && cell.toUpperCase().includes('CATEGORÍA')
      )
    ) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    return {
      success: false,
      file_type: 'control_gastos',
      sheet_name: targetSheet,
      available_sheets: availableMonths,
      transactions: [],
      categories: [],
      errors: ['No se encontró la fila de encabezados'],
    }
  }

  // Parse data rows
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !Array.isArray(row) || row.length < 5) continue

    const [category, subcategory, dateValue, description, amount] = row

    // Skip empty or summary rows
    if (!category || !dateValue || amount === undefined || amount === null)
      continue
    if (typeof category !== 'string') continue

    try {
      let dateStr: string
      if (typeof dateValue === 'number') {
        dateStr = excelDateToISO(dateValue)
      } else if (typeof dateValue === 'string') {
        dateStr = dateValue
      } else {
        continue
      }

      const parsedAmount =
        typeof amount === 'number' ? amount : parseFloat(String(amount))
      if (isNaN(parsedAmount)) continue

      // Sanitize text fields to prevent injection attacks
      const safeDescription = sanitizeCSVValue(String(description || '')) || 'Sin descripción'
      const safeCategory = sanitizeCSVValue(String(category || ''))
      const safeSubcategory = sanitizeCSVValue(String(subcategory || ''))

      transactions.push({
        date: dateStr,
        description: safeDescription,
        amount: -Math.abs(parsedAmount), // Gastos como negativos
        bank_category: safeCategory,
        bank_subcategory: safeSubcategory,
      })

      // Track categories
      const cat = safeCategory
      const subcat = safeSubcategory
      if (!categoriesSet.has(cat)) {
        categoriesSet.set(cat, new Set())
      }
      if (subcat) {
        categoriesSet.get(cat)!.add(subcat)
      }
    } catch (err) {
      errors.push(`Error en fila ${i + 1}: ${(err as Error).message}`)
    }
  }

  const categories: { category: string; subcategory: string }[] = []
  categoriesSet.forEach((subcats, cat) => {
    if (subcats.size === 0) {
      categories.push({ category: cat, subcategory: '' })
    } else {
      subcats.forEach((subcat) => {
        categories.push({ category: cat, subcategory: subcat })
      })
    }
  })

  return {
    success: true,
    file_type: 'control_gastos',
    sheet_name: targetSheet,
    available_sheets: availableMonths,
    transactions,
    categories,
    errors,
  }
}

function parseMovimientosCC(workbook: XLSX.WorkBook): ParseResult {
  const ws = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]

  const transactions: ParsedTransaction[] = []
  const categoriesSet = new Map<string, Set<string>>()
  const errors: string[] = []

  // Find header row (F. VALOR, CATEGORÍA, SUBCATEGORÍA, DESCRIPCIÓN, COMENTARIO, IMPORTE)
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i]
    if (
      row &&
      Array.isArray(row) &&
      row.some(
        (cell) =>
          typeof cell === 'string' && cell.toUpperCase().includes('F. VALOR')
      )
    ) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    return {
      success: false,
      file_type: 'movimientos_cc',
      transactions: [],
      categories: [],
      errors: ['No se encontró la fila de encabezados'],
    }
  }

  // Find column indices dynamically
  const headerRow = data[headerRowIndex] as string[]
  const colIndices: Record<string, number> = {}
  headerRow.forEach((cell, idx) => {
    if (typeof cell === 'string') {
      const upper = cell.toUpperCase().trim()
      if (upper.includes('F. VALOR') || upper === 'FECHA') colIndices.date = idx
      // Check SUBCATEGORÍA first (more specific) to avoid collision with CATEGORÍA
      if (upper === 'SUBCATEGORÍA' || upper === 'SUBCATEGORIA') {
        colIndices.subcategory = idx
      } else if (upper === 'CATEGORÍA' || upper === 'CATEGORIA') {
        colIndices.category = idx
      }
      if (upper.includes('DESCRIPCIÓN') || upper.includes('DESCRIPCION') || upper === 'CONCEPTO') colIndices.description = idx
      if (upper.includes('IMPORTE') || upper === 'CANTIDAD' || upper === 'AMOUNT') colIndices.amount = idx
    }
  })

  // Validate required columns
  if (colIndices.amount === undefined) {
    return {
      success: false,
      file_type: 'movimientos_cc',
      transactions: [],
      categories: [],
      errors: ['No se encontró la columna de importe'],
    }
  }

  // Parse data rows
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !Array.isArray(row)) continue

    const dateValue = row[colIndices.date]
    const category = row[colIndices.category]
    const subcategory = row[colIndices.subcategory]
    const description = row[colIndices.description]
    const amount = row[colIndices.amount]

    // Skip empty rows
    if (!dateValue || amount === undefined || amount === null) continue

    try {
      let dateStr: string
      if (typeof dateValue === 'number') {
        dateStr = excelDateToISO(dateValue)
      } else if (typeof dateValue === 'string') {
        dateStr = dateValue
      } else {
        continue
      }

      const parsedAmount =
        typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^\d.,-]/g, ''))
      if (isNaN(parsedAmount)) continue

      // Sanitize text fields to prevent injection attacks
      const safeDescription = sanitizeCSVValue(String(description || '')) || 'Sin descripción'
      const safeCategory = sanitizeCSVValue(String(category || ''))
      const safeSubcategory = sanitizeCSVValue(String(subcategory || ''))

      transactions.push({
        date: dateStr,
        description: safeDescription,
        amount: parsedAmount,
        bank_category: safeCategory,
        bank_subcategory: safeSubcategory,
      })

      // Track categories
      const cat = safeCategory
      const subcat = safeSubcategory
      if (cat && !categoriesSet.has(cat)) {
        categoriesSet.set(cat, new Set())
      }
      if (cat && subcat) {
        categoriesSet.get(cat)!.add(subcat)
      }
    } catch (err) {
      errors.push(`Error en fila ${i + 1}: ${(err as Error).message}`)
    }
  }

  const categories: { category: string; subcategory: string }[] = []
  categoriesSet.forEach((subcats, cat) => {
    if (subcats.size === 0) {
      categories.push({ category: cat, subcategory: '' })
    } else {
      subcats.forEach((subcat) => {
        categories.push({ category: cat, subcategory: subcat })
      })
    }
  })

  return {
    success: true,
    file_type: 'movimientos_cc',
    transactions,
    categories,
    errors,
  }
}

// ============ CSV PARSING ============

interface CSVColumnMapping {
  date: number
  description: number
  amount: number
  category?: number
  subcategory?: number
}

type CSVFormat = 'revolut' | 'generic' | 'unknown'

// sanitizeCSVValue is imported from ../../utils/sanitize.js
// It handles both CSV injection and XSS protection

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function detectCSVFormat(headers: string[]): { format: CSVFormat; mapping: CSVColumnMapping | null } {
  const headerLower = headers.map(h => h.toLowerCase().trim())

  // Revolut format detection
  if (headerLower.includes('completed date') && headerLower.includes('type') && headerLower.includes('amount')) {
    return {
      format: 'revolut',
      mapping: {
        date: headerLower.indexOf('completed date'),
        description: headerLower.indexOf('description'),
        amount: headerLower.indexOf('amount'),
        category: headerLower.indexOf('type'),
      }
    }
  }

  // Generic CSV - flexible column detection
  // Date patterns: fecha, date, f. valor, mi_fecha, fecha_operacion, etc.
  const dateIdx = headerLower.findIndex(h =>
    h.includes('date') || h.includes('fecha') || h.includes('valor') || h.includes('dia')
  )

  // Description patterns: descripcion, description, concepto, detalle, texto, movimiento
  const descIdx = headerLower.findIndex(h =>
    h.includes('description') || h.includes('descripcion') || h.includes('descripción') ||
    h.includes('concepto') || h.includes('detalle') || h.includes('texto') ||
    h.includes('movimiento') || h.includes('operacion')
  )

  // Amount patterns: importe, amount, cantidad, monto, valor, euro
  const amountIdx = headerLower.findIndex(h =>
    h.includes('amount') || h.includes('importe') || h.includes('cantidad') ||
    h.includes('monto') || h.includes('euro') || h.includes('valor')
  )

  // Category patterns
  const categoryIdx = headerLower.findIndex(h =>
    h === 'category' || h === 'categoría' || h === 'categoria' || h === 'type' || h === 'tipo'
  )
  const subcategoryIdx = headerLower.findIndex(h =>
    h === 'subcategory' || h === 'subcategoría' || h === 'subcategoria'
  )

  // If we found all 3 required fields
  if (dateIdx !== -1 && descIdx !== -1 && amountIdx !== -1) {
    return {
      format: 'generic',
      mapping: {
        date: dateIdx,
        description: descIdx,
        amount: amountIdx,
        category: categoryIdx !== -1 ? categoryIdx : undefined,
        subcategory: subcategoryIdx !== -1 ? subcategoryIdx : undefined,
      }
    }
  }

  // Last resort: try positional detection (3 columns: date, desc, amount)
  if (headers.length >= 3) {
    // Check if first column looks like a date
    const firstHeader = headerLower[0]
    const hasDateLikeFirst = firstHeader.includes('fecha') || firstHeader.includes('date') ||
                             /\d/.test(firstHeader) === false // No numbers in header

    if (hasDateLikeFirst) {
      return {
        format: 'generic',
        mapping: {
          date: 0,
          description: 1,
          amount: headers.length - 1, // Last column is usually amount
          category: undefined,
          subcategory: undefined,
        }
      }
    }
  }

  return { format: 'unknown', mapping: null }
}

function parseDateToISO(dateStr: string): string | null {
  if (!dateStr) return null

  // Already ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }

  // Revolut format: YYYY-MM-DD HH:MM:SS
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
    return dateStr.split(' ')[0]
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const euMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (euMatch) {
    const [, day, month, year] = euMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // MM/DD/YYYY (US format)
  const usMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (usMatch) {
    // Assume EU format by default for Spanish banks
    const [, day, month, year] = usMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return null
}

function parseAmount(value: string): number | null {
  if (!value) return null

  // Remove currency symbols and spaces
  let cleaned = value.replace(/[€$£\s]/g, '').trim()

  // Handle European format: 1.234,56 -> 1234.56
  if (/^\-?\d{1,3}(\.\d{3})*,\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  }
  // Handle format with comma as thousands: 1,234.56
  else if (/^\-?\d{1,3}(,\d{3})*\.\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '')
  }
  // Simple comma decimal: 123,45 -> 123.45
  else if (/^\-?\d+,\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(',', '.')
  }

  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseCSVFile(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter(line => line.trim())

  if (lines.length < 2) {
    return {
      success: false,
      file_type: 'unknown',
      transactions: [],
      categories: [],
      errors: ['El archivo CSV está vacío o no tiene datos'],
    }
  }

  const headers = parseCSVLine(lines[0])
  const { format, mapping } = detectCSVFormat(headers)

  if (!mapping) {
    return {
      success: false,
      file_type: 'unknown',
      transactions: [],
      categories: [],
      errors: [
        'No se pudieron detectar las columnas requeridas (date, description, amount). ' +
        'Columnas encontradas: ' + headers.join(', ')
      ],
    }
  }

  const transactions: ParsedTransaction[] = []
  const categoriesSet = new Map<string, Set<string>>()
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i])
    if (row.length < 3) continue

    const rowNum = i + 1

    // Extract and validate required fields
    const dateRaw = row[mapping.date]
    const descriptionRaw = row[mapping.description]
    const amountRaw = row[mapping.amount]

    // Validate date
    const date = parseDateToISO(dateRaw)
    if (!date) {
      errors.push(`Fila ${rowNum}: Fecha inválida o faltante "${dateRaw}"`)
      continue
    }

    // Validate and sanitize description (prevent CSV injection)
    const description = sanitizeCSVValue(descriptionRaw || '')
    if (!description) {
      errors.push(`Fila ${rowNum}: Descripción vacía o faltante`)
      continue
    }

    // Validate amount
    const amount = parseAmount(amountRaw)
    if (amount === null) {
      errors.push(`Fila ${rowNum}: Importe inválido o faltante "${amountRaw}"`)
      continue
    }

    // Optional fields (also sanitized)
    const category = mapping.category !== undefined ? sanitizeCSVValue(row[mapping.category] || '') || null : null
    const subcategory = mapping.subcategory !== undefined ? sanitizeCSVValue(row[mapping.subcategory] || '') || null : null

    transactions.push({
      date,
      description,
      amount,
      bank_category: category,
      bank_subcategory: subcategory,
    })

    // Track categories
    if (category) {
      if (!categoriesSet.has(category)) {
        categoriesSet.set(category, new Set())
      }
      if (subcategory) {
        categoriesSet.get(category)!.add(subcategory)
      }
    }
  }

  const categories: { category: string; subcategory: string }[] = []
  categoriesSet.forEach((subcats, cat) => {
    if (subcats.size === 0) {
      categories.push({ category: cat, subcategory: '' })
    } else {
      subcats.forEach((subcat) => {
        categories.push({ category: cat, subcategory: subcat })
      })
    }
  })

  const fileType: FileType = format === 'revolut' ? 'csv_revolut' : 'csv_generic'

  return {
    success: transactions.length > 0,
    file_type: fileType,
    transactions,
    categories,
    errors,
  }
}

// ============ EXCEL PARSING ============

function detectFileType(
  workbook: XLSX.WorkBook
): 'control_gastos' | 'movimientos_cc' | 'unknown' {
  // Check for Control de Gastos (has month sheets)
  const monthSheets = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  if (workbook.SheetNames.some((name) => monthSheets.includes(name.trim()))) {
    return 'control_gastos'
  }

  // Check for Movimientos CC (has F. VALOR column)
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][]

  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i]
    if (
      row &&
      Array.isArray(row) &&
      row.some(
        (cell) =>
          typeof cell === 'string' && cell.toUpperCase().includes('F. VALOR')
      )
    ) {
      return 'movimientos_cc'
    }
  }

  return 'unknown'
}

export function parseFile(
  buffer: Buffer,
  filename: string,
  sheetName?: string
): ParseResult {
  const extension = filename.toLowerCase().split('.').pop()

  // CSV files
  if (extension === 'csv') {
    try {
      const content = buffer.toString('utf-8')
      return parseCSVFile(content)
    } catch (err) {
      return {
        success: false,
        file_type: 'unknown',
        transactions: [],
        categories: [],
        errors: [`Error al leer el archivo CSV: ${(err as Error).message}`],
      }
    }
  }

  // Excel files (.xls, .xlsx)
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const fileType = detectFileType(workbook)

    switch (fileType) {
      case 'control_gastos':
        return parseControlGastos(workbook, sheetName)
      case 'movimientos_cc':
        return parseMovimientosCC(workbook)
      default:
        return {
          success: false,
          file_type: 'unknown',
          transactions: [],
          categories: [],
          errors: [
            'Formato de archivo no reconocido. Formatos soportados: CSV, Control de Gastos (.xlsx), Movimientos CC (.xls)',
          ],
        }
    }
  } catch (err) {
    return {
      success: false,
      file_type: 'unknown',
      transactions: [],
      categories: [],
      errors: [`Error al leer el archivo: ${(err as Error).message}`],
    }
  }
}

// Backwards compatibility
export function parseExcelFile(
  buffer: Buffer,
  sheetName?: string
): ParseResult {
  return parseFile(buffer, 'file.xlsx', sheetName)
}

export function getAvailableSheets(buffer: Buffer): string[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    return workbook.SheetNames
  } catch {
    return []
  }
}
