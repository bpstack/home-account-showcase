// Remembers the column assignment of each statement layout, keyed by its header names. Header
// names are the bank's, not the user's data, so they can stay in this browser's localStorage.

import type { ColumnMap, ColumnRole } from '@/lib/import'

const PREFIX = 'import-columns:v1:'
const ROLES: ColumnRole[] = [
  'date',
  'description',
  'amount',
  'debit',
  'credit',
  'category',
  'subcategory',
]

/** The saved assignment for a layout, or null if none (or unreadable, or out of range). */
export function loadColumns(signature: string, columnCount: number): ColumnMap | null {
  try {
    const raw = localStorage.getItem(PREFIX + signature)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const columns: ColumnMap = {}
    for (const role of ROLES) {
      const index = (parsed as Record<string, unknown>)[role]
      if (index === undefined) continue
      if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= columnCount) {
        return null
      }
      columns[role] = index as number
    }
    return columns
  } catch {
    return null
  }
}

export function saveColumns(signature: string, columns: ColumnMap): void {
  try {
    localStorage.setItem(PREFIX + signature, JSON.stringify(columns))
  } catch {
    // Private mode or storage full: the assignment is simply not remembered
  }
}
