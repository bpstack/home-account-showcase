import { utils, write } from 'xlsx'
import { describe, expect, it } from 'vitest'
import { previewStatement } from './index'
import { decodeText, detectDelimiter, readStatement } from './read'

// Builds a real spreadsheet file in memory, as a bank export would arrive
function spreadsheet(rows: unknown[][], bookType: 'xls' | 'xlsx'): Uint8Array {
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), 'Movimientos')
  return new Uint8Array(write(workbook, { bookType, type: 'array' }))
}

function windows1252(text: string): Uint8Array {
  // Every character in these tests is in Latin-1, which Windows-1252 matches byte for byte
  return Uint8Array.from(text, (char) => char.charCodeAt(0))
}

const BANK_ROWS = [
  ['Número de cuenta', null, 'ES00 0000 0000 00 0000000000', null, null, null],
  [null, null, 'Titular', 'Persona de prueba', null, null],
  [null, null, 'Fecha exportación', '18/11/2026', null, null],
  ['F. VALOR', 'CATEGORÍA', 'SUBCATEGORÍA', 'DESCRIPCIÓN', 'COMENTARIO', 'IMPORTE (€)'],
  [44927, 'Compras', 'Supermercado', 'Compra en tienda', null, -25.4],
  [44928, 'Ingresos', 'Nómina', 'Nómina enero', null, 1500],
]

describe('decodeText', () => {
  it('decodes UTF-8 and drops the byte order mark', () => {
    expect(decodeText(new TextEncoder().encode('\uFEFFCafé;Niño'))).toBe('Café;Niño')
  })

  it('falls back to Windows-1252 for bytes that are not UTF-8', () => {
    expect(decodeText(windows1252('Café;Niño'))).toBe('Café;Niño')
  })
})

describe('detectDelimiter', () => {
  it('detects semicolons, tabs and commas', () => {
    expect(detectDelimiter('Fecha;Concepto;Importe\n18/11/2026;Pan;-1,20')).toBe(';')
    expect(detectDelimiter('Fecha\tConcepto\tImporte\n18/11/2026\tPan\t-1,20')).toBe('\t')
    expect(detectDelimiter('Date,Description,Amount\n2026-11-18,Bread,-1.20')).toBe(',')
  })

  it('ignores separators inside quotes', () => {
    expect(detectDelimiter('Fecha;Concepto;Importe\n18/11/2026;"Pan, leche";"-1,20"')).toBe(';')
  })
})

describe('readStatement', () => {
  it('reads a legacy .xls with account details above the header', () => {
    const rows = readStatement(spreadsheet(BANK_ROWS, 'xls'))
    expect(rows[3]).toEqual(BANK_ROWS[3])
    expect(rows[4]).toEqual([44927, 'Compras', 'Supermercado', 'Compra en tienda', null, -25.4])
  })

  it('reads an .xlsx', () => {
    const rows = readStatement(spreadsheet(BANK_ROWS, 'xlsx'))
    expect(rows[5]).toEqual([44928, 'Ingresos', 'Nómina', 'Nómina enero', null, 1500])
  })

  it('keeps CSV values as text so Spanish amounts are not misread', () => {
    const csv = 'Fecha;Concepto;Importe\n18/11/2026;"Pan; leche";-1.234,56\n'
    expect(readStatement(windows1252(csv))).toEqual([
      ['Fecha', 'Concepto', 'Importe'],
      ['18/11/2026', 'Pan; leche', '-1.234,56'],
    ])
  })

  it('refuses files over 5 MB', () => {
    expect(() => readStatement(new Uint8Array(5 * 1024 * 1024 + 1))).toThrow('5 MB')
  })
})

describe('previewStatement', () => {
  it('turns a bank .xls into movements without help', () => {
    const { layout, parsed } = previewStatement(spreadsheet(BANK_ROWS, 'xls'))
    expect(layout.headerRowIndex).toBe(3)
    expect(parsed.errors).toEqual([])
    expect(parsed.movements).toEqual([
      {
        row: 5,
        date: '2023-01-01',
        description: 'Compra en tienda',
        amount: -25.4,
        category: 'Compras',
        subcategory: 'Supermercado',
      },
      {
        row: 6,
        date: '2023-01-02',
        description: 'Nómina enero',
        amount: 1500,
        category: 'Ingresos',
        subcategory: 'Nómina',
      },
    ])
  })

  it('turns a Windows-1252 CSV with debit and credit columns into movements', () => {
    const csv = [
      'Fecha operación;Concepto;Cargo;Abono;Saldo',
      '01/10/2026;Panadería Muñoz;3,20;;996,80',
      '02/10/2026;Devolución;;10,00;1.006,80',
    ].join('\r\n')
    const { parsed } = previewStatement(windows1252(csv))
    expect(parsed.errors).toEqual([])
    expect(parsed.movements.map((m) => [m.date, m.description, m.amount])).toEqual([
      ['2026-10-01', 'Panadería Muñoz', -3.2],
      ['2026-10-02', 'Devolución', 10],
    ])
  })

  it('reads nothing until the columns are known', () => {
    const { layout, parsed } = previewStatement(new TextEncoder().encode('a,b\n1,2\n'))
    expect(layout.headerRowIndex).toBe(-1)
    expect(parsed).toEqual({ movements: [], errors: [] })
  })
})
