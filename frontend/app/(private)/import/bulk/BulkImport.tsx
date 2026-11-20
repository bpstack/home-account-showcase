'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { importApi, type Category, type ImportResult } from '@/lib/apiClient'
import {
  detectLayout,
  layoutSignature,
  parseWithColumns,
  type ColumnMap,
  type Rows,
} from '@/lib/import'
import { computeImportHashes, matchSavedMappings } from '@/lib/import/confirm'
import { useImportTransactions } from '@/lib/queries/useImportTransactions'
import { useCryptoStore } from '@/stores/cryptoStore'
import { loadColumns, saveColumns } from './columnMemory'
import { ReviewStep, type BankPair } from './ReviewStep'
import { ResultStep } from './ResultStep'
import { suggestSubcategory } from './suggest'
import { UploadStep } from './UploadStep'

interface Statement {
  fileName: string
  rows: Rows
  headerRowIndex: number
  headers: string[]
  signature: string
}

type Stage =
  | { step: 'upload' }
  | { step: 'review'; statement: Statement }
  | { step: 'result'; result: ImportResult }

function pairKey(category: string | null, subcategory: string | null): string {
  return JSON.stringify([category ?? '', subcategory ?? ''])
}

function toStatement(fileName: string, rows: Rows): { statement: Statement; columns: ColumnMap } {
  const layout = detectLayout(rows)
  // No header recognised: take the first row as the header and let the user assign the columns
  const headerRowIndex = layout.headerRowIndex >= 0 ? layout.headerRowIndex : 0
  const headers =
    layout.headerRowIndex >= 0 ? layout.headers : (rows[0] ?? []).map((c) => String(c ?? ''))
  const signature = layoutSignature(headers)
  const columns = loadColumns(signature, headers.length) ?? layout.columns
  return { statement: { fileName, rows, headerRowIndex, headers, signature }, columns }
}

interface BulkImportProps {
  accountId: string
  categories: Category[]
}

export function BulkImport({ accountId, categories }: BulkImportProps) {
  const queryClient = useQueryClient()
  const importMutation = useImportTransactions()
  const accountKey = useCryptoStore((s) => s.accountKeys.get(accountId)?.key ?? null)

  const [stage, setStage] = useState<Stage>({ step: 'upload' })
  const [columns, setColumns] = useState<ColumnMap>({})
  // Choices the user made on this screen; the rest come from saved mappings or suggestions
  const [chosen, setChosen] = useState<Record<string, string | null>>({})
  const [remembered, setRemembered] = useState<Map<string, string>>(new Map())
  // For each movement, whether it is already imported (null until known)
  const [duplicates, setDuplicates] = useState<boolean[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const statement = stage.step === 'review' ? stage.statement : null

  const parsed = useMemo(
    () =>
      statement
        ? parseWithColumns(statement.rows, statement.headerRowIndex, columns)
        : { movements: [], errors: [] },
    [statement, columns]
  )

  // Bank category pairs in the statement, in order of first appearance
  const bankPairs = useMemo(() => {
    const found = new Map<
      string,
      { category: string | null; subcategory: string | null; count: number }
    >()
    for (const m of parsed.movements) {
      if (!m.category && !m.subcategory) continue
      const key = pairKey(m.category, m.subcategory)
      const pair = found.get(key)
      if (pair) pair.count++
      else found.set(key, { category: m.category, subcategory: m.subcategory, count: 1 })
    }
    return [...found.entries()].map(([key, p]) => ({ key, ...p }))
  }, [parsed.movements])

  const { data: saved } = useQuery({
    queryKey: ['import', 'mappings', accountId],
    queryFn: () => importApi.getSavedMappings(accountId),
    enabled: !!accountId,
  })
  const savedMappings = saved?.mappings

  // Saved mappings are keyed hashes: hash this statement's pairs to find them
  useEffect(() => {
    if (!accountKey || !savedMappings?.length || bankPairs.length === 0) {
      setRemembered(new Map())
      return
    }
    let cancelled = false
    matchSavedMappings(accountKey, bankPairs, savedMappings).then((found) => {
      if (cancelled) return
      const map = new Map<string, string>()
      found.forEach((id, i) => {
        if (id) map.set(bankPairs[i].key, id)
      })
      setRemembered(map)
    })
    return () => {
      cancelled = true
    }
  }, [accountKey, savedMappings, bankPairs])

  const { data: stored } = useQuery({
    queryKey: ['import', 'hashes', accountId],
    queryFn: () => importApi.getImportHashes(accountId),
    enabled: !!accountId && stage.step === 'review',
  })
  const storedHashes = stored?.hashes

  // Same hashes the import will send: a match is a movement the server will skip
  useEffect(() => {
    if (!accountKey || !storedHashes || parsed.movements.length === 0) {
      setDuplicates(null)
      return
    }
    let cancelled = false
    const known = new Set(storedHashes)
    computeImportHashes(accountKey, parsed.movements).then((hashes) => {
      if (!cancelled) setDuplicates(hashes.map((h) => known.has(h)))
    })
    return () => {
      cancelled = true
    }
  }, [accountKey, storedHashes, parsed.movements])

  const pairs: BankPair[] = useMemo(
    () =>
      bankPairs.map((p) => ({
        ...p,
        subcategoryId:
          p.key in chosen
            ? chosen[p.key]
            : (remembered.get(p.key) ?? suggestSubcategory(p, categories)),
      })),
    [bankPairs, chosen, remembered, categories]
  )

  const subcategoryOptions = useMemo(() => {
    const options = [{ value: '', label: 'Sin asignar' }]
    for (const cat of categories) {
      for (const sub of cat.subcategories ?? []) {
        options.push({ value: sub.id, label: `${cat.name} → ${sub.name}` })
      }
    }
    return options
  }, [categories])

  const restart = () => {
    setStage({ step: 'upload' })
    setColumns({})
    setChosen({})
    setError(null)
  }

  const handleRead = (fileName: string, rows: Rows) => {
    const next = toStatement(fileName, rows)
    setColumns(next.columns)
    setChosen({})
    setError(null)
    setStage({ step: 'review', statement: next.statement })
  }

  const handleConfirm = () => {
    if (!statement) return
    setError(null)
    importMutation.mutate(
      {
        account_id: accountId,
        movements: parsed.movements.map((m) => ({
          date: m.date,
          description: m.description,
          amount: m.amount,
          category: m.category,
          subcategory: m.subcategory,
        })),
        choices: pairs.map((p) => ({
          category: p.category,
          subcategory: p.subcategory,
          subcategory_id: p.subcategoryId,
        })),
      },
      {
        onSuccess: (result) => {
          saveColumns(statement.signature, columns)
          queryClient.invalidateQueries({ queryKey: ['import', 'mappings', accountId] })
          queryClient.invalidateQueries({ queryKey: ['import', 'hashes', accountId] })
          setStage({ step: 'result', result })
          toast.success('Importación completada', {
            description:
              result.inserted === 1
                ? '1 transacción guardada'
                : `${result.inserted} transacciones guardadas`,
          })
        },
        onError: (err) => {
          setError(err.message || 'No se pudo importar. Inténtalo de nuevo')
        },
      }
    )
  }

  if (stage.step === 'result') {
    return <ResultStep result={stage.result} onRestart={restart} />
  }
  if (stage.step === 'review') {
    return (
      <ReviewStep
        fileName={stage.statement.fileName}
        headers={stage.statement.headers}
        columns={columns}
        onColumnsChange={setColumns}
        parsed={parsed}
        duplicates={duplicates}
        pairs={pairs}
        subcategoryOptions={subcategoryOptions}
        onChoiceChange={(key, id) => setChosen((prev) => ({ ...prev, [key]: id }))}
        isLocked={!accountKey}
        isImporting={importMutation.isPending}
        error={error}
        onConfirm={handleConfirm}
        onBack={restart}
      />
    )
  }
  return <UploadStep onRead={handleRead} />
}
