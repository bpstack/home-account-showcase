import { describe, expect, it } from 'vitest'
import { decrypt, generateAccountKey } from '../crypto'
import {
  buildImportPayload,
  computeImportHashes,
  matchSavedMappings,
  type ImportMovement,
} from './confirm'

// Invented data. Distinctive strings so a leak is easy to find in the serialized payload.
const ACCOUNT = '00000000-0000-4000-8000-000000000001'
const SUB_FOOD = '00000000-0000-4000-8000-0000000000aa'
const SUB_FUEL = '00000000-0000-4000-8000-0000000000bb'

const coffee: ImportMovement = {
  date: '2026-03-02',
  description: 'CAFETERIA ZZQX',
  amount: -2.4,
  category: 'OCIOPRIVADO',
  subcategory: 'BARESPRIVADO',
}
const fuel: ImportMovement = {
  date: '2026-03-03',
  description: 'GASOLINERA ZZQY',
  amount: -1234.56,
  category: 'MOTORPRIVADO',
  subcategory: 'GASOLINAPRIVADO',
}
const salary: ImportMovement = {
  date: '2026-03-04',
  description: 'NOMINA ZZQW',
  amount: 2100.75,
  category: null,
  subcategory: null,
}

const HEX64 = /^[0-9a-f]{64}$/

describe('buildImportPayload', () => {
  it('sends no plaintext description, amount or bank category', async () => {
    const key = await generateAccountKey()
    const payload = await buildImportPayload(
      ACCOUNT,
      key,
      [coffee, fuel, salary],
      [{ category: 'MOTORPRIVADO', subcategory: 'GASOLINAPRIVADO', subcategory_id: SUB_FUEL }]
    )
    const json = JSON.stringify(payload)
    // Only strings that base64 and hex cannot produce by chance (a space, a dot, a comma)
    const secrets = [
      'CAFETERIA ZZQX',
      'GASOLINERA ZZQY',
      'NOMINA ZZQW',
      '1234.56',
      '1234,56',
      '2.4',
      '2100.75',
    ]
    for (const secret of [...secrets, 'OCIOPRIVADO', 'MOTORPRIVADO', 'GASOLINAPRIVADO']) {
      expect(json).not.toContain(secret)
    }
    for (const tx of payload.transactions) {
      expect(Object.keys(tx).sort()).toEqual(
        [
          'amount_encrypted',
          'amount_sign',
          'bank_category_encrypted',
          'bank_subcategory_encrypted',
          'date',
          'description_encrypted',
          'import_hash',
          'subcategory_id',
        ].sort()
      )
    }
  })

  it('encrypts what the owner can decrypt back', async () => {
    const key = await generateAccountKey()
    const { transactions } = await buildImportPayload(ACCOUNT, key, [fuel, salary], [])
    const [f, s] = transactions
    expect(await decrypt(f.description_encrypted, key)).toBe('GASOLINERA ZZQY')
    expect(Number(await decrypt(f.amount_encrypted, key))).toBe(-1234.56)
    expect(await decrypt(f.bank_category_encrypted!, key)).toBe('MOTORPRIVADO')
    expect(await decrypt(f.bank_subcategory_encrypted!, key)).toBe('GASOLINAPRIVADO')
    expect([f.date, f.amount_sign]).toEqual(['2026-03-03', 'negative'])
    expect([s.amount_sign, s.bank_category_encrypted, s.bank_subcategory_encrypted]).toEqual([
      'positive',
      null,
      null,
    ])
  })

  it('gives the same import_hash when the same statement is imported again', async () => {
    const key = await generateAccountKey()
    const first = await buildImportPayload(ACCOUNT, key, [coffee, fuel], [])
    const again = await buildImportPayload(ACCOUNT, key, [coffee, fuel], [])
    expect(again.transactions.map((t) => t.import_hash)).toEqual(
      first.transactions.map((t) => t.import_hash)
    )
    for (const t of first.transactions) expect(t.import_hash).toMatch(HEX64)
  })

  it('ignores case and spacing of the description in the import_hash', async () => {
    const key = await generateAccountKey()
    const respaced = { ...coffee, description: '  cafeteria   zzqx ' }
    const [a] = (await buildImportPayload(ACCOUNT, key, [coffee], [])).transactions
    const [b] = (await buildImportPayload(ACCOUNT, key, [respaced], [])).transactions
    expect(b.import_hash).toBe(a.import_hash)
  })

  it('gives a different import_hash for a different date, description or amount', async () => {
    const key = await generateAccountKey()
    const variants = [
      coffee,
      { ...coffee, date: '2026-03-01' },
      { ...coffee, description: 'CAFETERIA ZZQZ' },
      { ...coffee, amount: -2.41 },
    ]
    const { transactions } = await buildImportPayload(ACCOUNT, key, variants, [])
    expect(new Set(transactions.map((t) => t.import_hash)).size).toBe(4)
  })

  it('keeps two equal purchases on the same day as two movements', async () => {
    const key = await generateAccountKey()
    const { transactions } = await buildImportPayload(ACCOUNT, key, [coffee, coffee], [])
    expect(transactions[0].import_hash).not.toBe(transactions[1].import_hash)

    // An overlapping statement with the same two purchases is recognised as already imported
    const overlap = await buildImportPayload(ACCOUNT, key, [fuel, coffee, coffee], [])
    expect(overlap.transactions.slice(1).map((t) => t.import_hash)).toEqual(
      transactions.map((t) => t.import_hash)
    )
  })

  it('gives different hashes in different accounts', async () => {
    const [a] = (await buildImportPayload(ACCOUNT, await generateAccountKey(), [coffee], []))
      .transactions
    const [b] = (await buildImportPayload(ACCOUNT, await generateAccountKey(), [coffee], []))
      .transactions
    expect(a.import_hash).not.toBe(b.import_hash)
  })

  it('assigns the subcategory the user chose for each bank category pair', async () => {
    const key = await generateAccountKey()
    const { transactions, category_mappings } = await buildImportPayload(
      ACCOUNT,
      key,
      [coffee, fuel, salary],
      [
        { category: 'OCIOPRIVADO', subcategory: 'BARESPRIVADO', subcategory_id: SUB_FOOD },
        { category: 'MOTORPRIVADO', subcategory: 'GASOLINAPRIVADO', subcategory_id: null },
      ]
    )
    expect(transactions.map((t) => t.subcategory_id)).toEqual([SUB_FOOD, null, null])
    // Only assigned choices are remembered
    expect(category_mappings).toHaveLength(1)
    expect(category_mappings[0].subcategory_id).toBe(SUB_FOOD)
    expect(category_mappings[0].bank_category_hmac).toMatch(HEX64)
    expect(category_mappings[0].bank_subcategory_hmac).toMatch(HEX64)
  })
})

describe('matchSavedMappings', () => {
  it('finds a remembered choice in a later statement, whatever the case or spacing', async () => {
    const key = await generateAccountKey()
    const { category_mappings } = await buildImportPayload(
      ACCOUNT,
      key,
      [],
      [
        { category: 'OCIOPRIVADO', subcategory: 'BARESPRIVADO', subcategory_id: SUB_FOOD },
        { category: 'MOTORPRIVADO', subcategory: 'GASOLINAPRIVADO', subcategory_id: SUB_FUEL },
      ]
    )
    const found = await matchSavedMappings(
      key,
      [
        { category: ' ocioPrivado ', subcategory: 'BaresPrivado' },
        { category: 'MOTORPRIVADO', subcategory: 'GASOLINAPRIVADO' },
        { category: 'OCIOPRIVADO', subcategory: 'GASOLINAPRIVADO' }, // subcategory of another
        { category: null, subcategory: null },
      ],
      category_mappings
    )
    expect(found).toEqual([SUB_FOOD, SUB_FUEL, null, null])
  })

  it('finds nothing with another account key', async () => {
    const choice = {
      category: 'OCIOPRIVADO',
      subcategory: 'BARESPRIVADO',
      subcategory_id: SUB_FOOD,
    }
    const saved = await buildImportPayload(ACCOUNT, await generateAccountKey(), [], [choice])
    const found = await matchSavedMappings(
      await generateAccountKey(),
      [choice],
      saved.category_mappings
    )
    expect(found).toEqual([null])
  })
})

describe('computeImportHashes', () => {
  it('gives the hashes the payload sends, so the review marks what the server will skip', async () => {
    const key = await generateAccountKey()
    const movements = [coffee, coffee, fuel, salary]
    const { transactions } = await buildImportPayload(ACCOUNT, key, movements, [])
    expect(await computeImportHashes(key, movements)).toEqual(
      transactions.map((t) => t.import_hash)
    )
  })

  it('finds an earlier statement inside a later one, and only that', async () => {
    const key = await generateAccountKey()
    const stored = new Set(await computeImportHashes(key, [coffee, fuel]))
    const later = await computeImportHashes(key, [coffee, coffee, fuel, salary])
    // The second coffee of the later statement is a new purchase, not the stored one
    expect(later.map((h) => stored.has(h))).toEqual([true, false, true, false])
  })
})
