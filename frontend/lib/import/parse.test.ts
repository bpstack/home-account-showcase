import { describe, expect, it } from 'vitest'
import { parseMovements } from './parse'

describe('parseMovements', () => {
  it('reads Excel rows with date serials, signed amounts and bank categories', () => {
    const rows = [
      ['F. VALOR', 'CATEGORÍA', 'SUBCATEGORÍA', 'DESCRIPCIÓN', 'COMENTARIO', 'IMPORTE (€)'],
      [44927, 'Compras', 'Supermercado', 'Compra en tienda', null, -25.4],
      [44928, 'Ingresos', 'Nómina', 'Nómina enero', null, 1500],
    ]
    const columns = { date: 0, category: 1, subcategory: 2, description: 3, amount: 5 }
    expect(parseMovements(rows, 0, columns)).toEqual({
      movements: [
        {
          row: 2,
          date: '2023-01-01',
          description: 'Compra en tienda',
          amount: -25.4,
          category: 'Compras',
          subcategory: 'Supermercado',
        },
        {
          row: 3,
          date: '2023-01-02',
          description: 'Nómina enero',
          amount: 1500,
          category: 'Ingresos',
          subcategory: 'Nómina',
        },
      ],
      errors: [],
    })
  })

  it('reads CSV text with Spanish formats', () => {
    const rows = [
      ['Fecha', 'Concepto', 'Importe'],
      ['18/11/2026', 'Recibo luz', '-1.234,56'],
      ['19/11/2026', 'Transferencia recibida', '50,00'],
    ]
    const { movements, errors } = parseMovements(rows, 0, { date: 0, description: 1, amount: 2 })
    expect(errors).toEqual([])
    expect(movements.map((m) => [m.date, m.description, m.amount])).toEqual([
      ['2026-11-18', 'Recibo luz', -1234.56],
      ['2026-11-19', 'Transferencia recibida', 50],
    ])
  })

  it('combines separate debit and credit columns', () => {
    const rows = [
      ['Fecha', 'Concepto', 'Cargo', 'Abono'],
      ['01/10/2026', 'Alquiler', '700,00', ''],
      ['02/10/2026', 'Bizum recibido', '', '20,00'],
      ['03/10/2026', 'Comisión', '-2,50', null],
    ]
    const { movements } = parseMovements(rows, 0, { date: 0, description: 1, debit: 2, credit: 3 })
    expect(movements.map((m) => m.amount)).toEqual([-700, 20, -2.5])
  })

  it('skips empty rows and footers without date or amount', () => {
    const rows = [
      ['Fecha', 'Concepto', 'Importe'],
      ['18/11/2026', 'Café', '-1,50'],
      [null, null, null],
      ['', 'Total movimientos: 1', ''],
    ]
    const { movements, errors } = parseMovements(rows, 0, { date: 0, description: 1, amount: 2 })
    expect(movements).toHaveLength(1)
    expect(errors).toEqual([])
  })

  it('reports each unreadable row with its row number in the file', () => {
    const rows = [
      ['Cuenta corriente', null, null],
      ['Fecha', 'Concepto', 'Importe'],
      ['31/02/2026', 'Fecha imposible', '-1,00'],
      ['01/03/2026', '', '-1,00'],
      ['02/03/2026', 'Importe raro', 'n/a'],
      ['03/03/2026', 'Sin movimiento', '0,00'],
      ['04/03/2026', 'Bueno', '-3,00'],
    ]
    const { movements, errors } = parseMovements(rows, 1, { date: 0, description: 1, amount: 2 })
    expect(movements.map((m) => m.row)).toEqual([7])
    expect(errors).toEqual([
      { row: 3, reason: 'Fecha no válida: «31/02/2026»' },
      { row: 4, reason: 'Sin concepto' },
      { row: 5, reason: 'Importe no válido: «n/a»' },
      { row: 6, reason: 'Importe cero' },
    ])
  })

  it('rounds amounts to cents', () => {
    const rows = [
      ['Fecha', 'Concepto', 'Importe'],
      [44927, 'Redondeo', -0.1 - 0.2],
    ]
    const { movements } = parseMovements(rows, 0, { date: 0, description: 1, amount: 2 })
    expect(movements[0].amount).toBe(-0.3)
  })
})
