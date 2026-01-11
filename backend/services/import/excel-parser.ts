import XLSX from 'xlsx'

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  bank_category: string
  bank_subcategory: string
}

export interface ParseResult {
  success: boolean
  file_type: 'control_gastos' | 'movimientos_cc' | 'unknown'
  sheet_name?: string
  available_sheets?: string[]
  transactions: ParsedTransaction[]
  categories: { category: string; subcategory: string }[]
  errors: string[]
}

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

      transactions.push({
        date: dateStr,
        description: String(description || '').trim() || 'Sin descripción',
        amount: -Math.abs(parsedAmount), // Gastos como negativos
        bank_category: String(category).trim(),
        bank_subcategory: String(subcategory || '').trim(),
      })

      // Track categories
      const cat = String(category).trim()
      const subcat = String(subcategory || '').trim()
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

  // Parse data rows
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !Array.isArray(row) || row.length < 6) continue

    const [dateValue, category, subcategory, description, , amount] = row

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
        typeof amount === 'number' ? amount : parseFloat(String(amount))
      if (isNaN(parsedAmount)) continue

      transactions.push({
        date: dateStr,
        description: String(description || '').trim() || 'Sin descripción',
        amount: parsedAmount, // Ya viene con signo correcto
        bank_category: String(category || '').trim(),
        bank_subcategory: String(subcategory || '').trim(),
      })

      // Track categories
      const cat = String(category || '').trim()
      const subcat = String(subcategory || '').trim()
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

export function parseExcelFile(
  buffer: Buffer,
  sheetName?: string
): ParseResult {
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
            'Formato de archivo no reconocido. Use archivos de Control de Gastos (.xlsx) o Movimientos CC (.xls)',
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

export function getAvailableSheets(buffer: Buffer): string[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    return workbook.SheetNames
  } catch {
    return []
  }
}
