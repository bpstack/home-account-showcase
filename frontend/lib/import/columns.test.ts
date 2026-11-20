import { describe, expect, it } from 'vitest'
import { detectLayout, isComplete, layoutSignature, mapColumns, roleOf } from './columns'

describe('roleOf', () => {
  it('recognises the names Spanish banks use', () => {
    expect(roleOf('F. VALOR')).toBe('date')
    expect(roleOf('Fecha Operación')).toBe('date')
    expect(roleOf('CATEGORÍA')).toBe('category')
    expect(roleOf('SUBCATEGORÍA')).toBe('subcategory')
    expect(roleOf('DESCRIPCIÓN')).toBe('description')
    expect(roleOf('Concepto')).toBe('description')
    expect(roleOf('IMPORTE (€)')).toBe('amount')
    expect(roleOf('Cargo')).toBe('debit')
    expect(roleOf('Abono')).toBe('credit')
  })

  it('recognises English names', () => {
    expect(roleOf('Completed Date')).toBe('date')
    expect(roleOf('Description')).toBe('description')
    expect(roleOf('Amount')).toBe('amount')
  })

  it('never takes the balance as the amount', () => {
    expect(roleOf('Saldo')).toBeNull()
    expect(roleOf('SALDO (€)')).toBeNull()
    expect(roleOf('Balance')).toBeNull()
    expect(roleOf('Importe saldo')).toBeNull()
    expect(roleOf('Available balance')).toBeNull()
  })

  it('ignores unknown or empty names', () => {
    expect(roleOf('Comentario')).toBeNull()
    expect(roleOf('')).toBeNull()
    expect(roleOf(null)).toBeNull()
  })
})

describe('mapColumns', () => {
  it('maps each role to its first column', () => {
    expect(mapColumns(['Fecha', 'Fecha valor', 'Concepto', 'Importe', 'Saldo'])).toEqual({
      date: 0,
      description: 2,
      amount: 3,
    })
  })
})

describe('isComplete', () => {
  it('needs a date, a description and an amount', () => {
    expect(isComplete({ date: 0, description: 1, amount: 2 })).toBe(true)
    expect(isComplete({ date: 0, description: 1, debit: 2, credit: 3 })).toBe(true)
    expect(isComplete({ date: 0, description: 1 })).toBe(false)
    expect(isComplete({ description: 1, amount: 2 })).toBe(false)
  })
})

describe('detectLayout', () => {
  it('finds the header under the account details', () => {
    const rows = [
      ['Número de cuenta', null, 'ES00 0000 0000 00 0000000000', 'Titular', null, null],
      [null, null, 'Fecha exportación', '18/11/2026', null, null],
      [null, null, 'Saldo disponible', '1.000,00', null, null],
      ['F. VALOR', 'CATEGORÍA', 'SUBCATEGORÍA', 'DESCRIPCIÓN', 'COMENTARIO', 'IMPORTE (€)'],
      [46000, 'Compras', 'Supermercado', 'Compra en tienda', null, -25.4],
    ]
    expect(detectLayout(rows)).toEqual({
      headerRowIndex: 3,
      headers: [
        'F. VALOR',
        'CATEGORÍA',
        'SUBCATEGORÍA',
        'DESCRIPCIÓN',
        'COMENTARIO',
        'IMPORTE (€)',
      ],
      columns: { date: 0, category: 1, subcategory: 2, description: 3, amount: 5 },
    })
  })

  it('returns no header when no row is recognised', () => {
    const rows = [
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]
    expect(detectLayout(rows).headerRowIndex).toBe(-1)
  })
})

describe('layoutSignature', () => {
  it('is the same for headers that differ only in case and accents', () => {
    expect(layoutSignature(['Fecha', 'Descripción', 'IMPORTE (€)'])).toBe(
      layoutSignature(['FECHA', 'descripcion', 'Importe (€)'])
    )
  })
})
