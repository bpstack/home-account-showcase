'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCategories } from '@/lib/queries/categories'
import { importApi, transactions, ai, type ParseResult, type CategoryMapping, type Category, type CreateTransactionData } from '@/lib/apiClient'
import { useQueryClient } from '@tanstack/react-query'

interface SavedMapping {
  bank_category: string
  bank_subcategory: string
  subcategory_id: string
}
import { Button, Card, CardContent, Select, Input } from '@/components/ui'
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
  X,
  Plus,
  Save,
  Sparkles,
} from 'lucide-react'

type Step = 'upload' | 'preview' | 'mapping' | 'result'
type ImportMode = 'single' | 'batch' | 'bulk'

interface MappingState {
  [key: string]: string | null
}

interface SingleForm {
  description: string
  date: string
  amount: string
  type: 'expense' | 'income'
  category_id: string
  subcategory_id: string
}

export default function ImportPage() {
  const { account } = useAuth()
  const queryClient = useQueryClient()
  const { data: catData } = useCategories(account?.id || '')
  const categoryList = catData?.categories || []

  const [importMode, setImportMode] = useState<ImportMode>('single')
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [mappings, setMappings] = useState<MappingState>({})
  const [savedMappings, setSavedMappings] = useState<SavedMapping[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{
    total: number
    inserted: number
    skipped: number
    errors: string[]
  } | null>(null)

  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true)
  const [aiUsedInBackground, setAiUsedInBackground] = useState(false)
  const [aiActivityLog, setAiActivityLog] = useState<string[]>([])

  const [singleForm, setSingleForm] = useState<SingleForm>({
    description: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    type: 'expense',
    category_id: '',
    subcategory_id: '',
  })

  type BatchStep = 'input' | 'review'
  const [batchStep, setBatchStep] = useState<BatchStep>('input')
  const [batchForms, setBatchForms] = useState<SingleForm[]>([
    { description: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'expense', category_id: '', subcategory_id: '' },
    { description: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'expense', category_id: '', subcategory_id: '' },
  ])

  const savedMappingsLoaded = useRef(false)

  // Load saved mappings when account is available
  useEffect(() => {
    if (account?.id && !savedMappingsLoaded.current) {
      savedMappingsLoaded.current = true
      importApi.getSavedMappings(account.id).then((res) => {
        if (res.success && res.mappings) {
          setSavedMappings(res.mappings)
        }
      }).catch(() => {
        // Ignore errors loading saved mappings
      })
    }
  }, [account?.id])

  // Category options
  const categoryOptions = useMemo(() => [
    { value: '', label: 'Selecciona categoría' },
    ...categoryList.map(cat => ({ value: cat.id, label: cat.name }))
  ], [categoryList])

  const getSubcategoryOptions = (categoryId: string) => {
    const category = categoryList.find(c => c.id === categoryId)
    if (!category?.subcategories) return []
    return [
      { value: '', label: 'Selecciona subcategoría' },
      ...category.subcategories.map(sub => ({ value: sub.id, label: sub.name }))
    ]
  }

  const allSubcategoryOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [{ value: '', label: 'Sin asignar' }]
    categoryList.forEach((cat) => {
      if (cat.subcategories) {
        cat.subcategories.forEach((sub) => {
          options.push({
            value: sub.id,
            label: `${cat.name} → ${sub.name}`,
          })
        })
      }
    })
    return options
  }, [categoryList])

  // Auto-hide messages
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  // Single form handlers
  const handleSingleFormChange = (field: keyof SingleForm, value: string) => {
    setSingleForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSingleCategoryChange = (categoryId: string) => {
    handleSingleFormChange('category_id', categoryId)
    handleSingleFormChange('subcategory_id', '')
  }

  const handleSingleSubmit = async () => {
    if (!account) return
    if (!singleForm.description || !singleForm.date || !singleForm.amount) {
      setError('Completa todos los campos obligatorios')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const amount = singleForm.type === 'expense'
        ? -Math.abs(parseFloat(singleForm.amount))
        : Math.abs(parseFloat(singleForm.amount))

      const data: CreateTransactionData = {
        account_id: account.id,
        description: singleForm.description,
        date: singleForm.date,
        amount,
        subcategory_id: singleForm.subcategory_id || undefined,
      }

      const result = await transactions.create(data)

      if (result.success) {
        setSuccessMessage('Transacción añadida correctamente')
        setSingleForm({
          description: '',
          date: new Date().toISOString().split('T')[0],
          amount: '',
          type: 'expense',
          category_id: '',
          subcategory_id: '',
        })
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      } else {
        setError('Error al añadir transacción')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  // Batch form handlers
  const addBatchRow = () => {
    if (batchForms.length >= 10) return
    setBatchForms(prev => [
      ...prev,
      { description: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'expense', category_id: '', subcategory_id: '' }
    ])
  }

  const removeBatchRow = (index: number) => {
    if (batchForms.length <= 2) return
    setBatchForms(prev => prev.filter((_, i) => i !== index))
  }

  const handleBatchFormChange = (index: number, field: keyof SingleForm, value: string) => {
    setBatchForms(prev => {
      const newForms = [...prev]
      newForms[index] = { ...newForms[index], [field]: value }
      return newForms
    })
  }

  const handleBatchCategoryChange = (index: number, categoryId: string) => {
    handleBatchFormChange(index, 'category_id', categoryId)
    handleBatchFormChange(index, 'subcategory_id', '')
  }

  const validateBatchForms = () => {
    for (let i = 0; i < batchForms.length; i++) {
      const form = batchForms[i]
      if (!form.description.trim() || !form.date || !form.amount) {
        return { valid: false, row: i + 1 }
      }
      if (isNaN(parseFloat(form.amount))) {
        return { valid: false, row: i + 1 }
      }
    }
    return { valid: true, row: 0 }
  }

  const handleBatchSubmit = async () => {
    if (!account) return

    const validation = validateBatchForms()
    if (!validation.valid) {
      setError(`Fila ${validation.row}: Completa todos los campos obligatorios`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const results = await Promise.all(
        batchForms.map(form => {
          const amount = form.type === 'expense'
            ? -Math.abs(parseFloat(form.amount))
            : Math.abs(parseFloat(form.amount))

          const data: CreateTransactionData = {
            account_id: account.id,
            description: form.description,
            date: form.date,
            amount,
            subcategory_id: form.subcategory_id || undefined,
          }

          return transactions.create(data)
        })
      )

      const successCount = results.filter(r => r.success).length

      if (successCount === batchForms.length) {
        setSuccessMessage(`${successCount} transacciones añadidas correctamente`)
        setBatchForms([
          { description: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'expense', category_id: '', subcategory_id: '' },
          { description: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'expense', category_id: '', subcategory_id: '' },
        ])
        setBatchStep('input')
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      } else {
        setError(`${successCount}/${batchForms.length} transacciones guardadas. algumas fallaron.`)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetBatchForms = () => {
    setBatchForms([
      { description: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'expense', category_id: '', subcategory_id: '' },
      { description: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'expense', category_id: '', subcategory_id: '' },
    ])
    setBatchStep('input')
  }

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [])

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string || '')
      reader.onerror = () => reject(new Error('Error leyendo archivo'))
      reader.readAsText(file)
    })
  }

  const parseWithAI = async (file: File): Promise<ParseResult | null> => {
    try {
      const fileContent = await readFileAsText(file)
      const result = await ai.parseTransactions(fileContent)

      if (!result.success || !result.transactions || result.transactions.length === 0) {
        return null
      }

      const transactions = result.transactions.map(tx => ({
        date: tx.date || new Date().toISOString().split('T')[0],
        description: tx.description?.trim() || '',
        amount: tx.amount,
        bank_category: tx.category?.toLowerCase() || 'otros',
        bank_subcategory: tx.subcategory?.toLowerCase() || 'varios'
      }))

      const seen = new Set<string>()
      const categories: { category: string; subcategory: string }[] = []
      transactions.forEach(tx => {
        const key = `${tx.bank_category}|${tx.bank_subcategory}`
        if (!seen.has(key)) {
          seen.add(key)
          categories.push({ category: tx.bank_category, subcategory: tx.bank_subcategory })
        }
      })

      return {
        success: true,
        file_type: 'ai_parsed' as const,
        transactions,
        categories,
        errors: [],
        available_sheets: [],
        sheet_name: 'AI Parsed'
      }
    } catch (err) {
      console.error('AI parse error:', err)
      return null
    }
  }

  const categorizeWithAI = async (
    transactions: Array<{ description: string; date?: string; amount?: number }>
  ): Promise<Array<{ category: string; subcategory: string }>> => {
    try {
      const result = await ai.categorize(transactions)
      if (result.success && result.categories) {
        const logs: string[] = []
        transactions.forEach((tx, idx) => {
          const cat = result.categories[idx]
          if (cat) {
            logs.push(`📝 "${tx.description.substring(0, 40)}..." → ${cat.category}/${cat.subcategory}`)
          }
        })
        setAiActivityLog(logs)
        return result.categories
      }
      return []
    } catch (err) {
      console.error('AI categorize error:', err)
      return []
    }
  }

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)
    setAiUsedInBackground(false)
    setIsLoading(true)

    try {
      const result = await importApi.parse(selectedFile)

      if (!result.success || !result.data.success) {
        if (aiAssistantEnabled) {
          console.log('Parser normal falló, intentando con AI...')
          const aiResult = await parseWithAI(selectedFile)

          if (aiResult && aiResult.transactions.length > 0) {
            setParseResult(aiResult)
            initializeMappings(aiResult.categories)
            setStep('preview')
            setAiUsedInBackground(true)
            setIsLoading(false)
            return
          }
        }

        const errorMsg = result.data?.errors?.[0] || 'Error al procesar el archivo'
        setError(`${errorMsg}. ${aiAssistantEnabled ? 'También falló el procesamiento con IA.' : ''}`)
        setIsLoading(false)
        return
      }

      setParseResult(result.data)

      if (result.data.file_type === 'control_gastos' && result.data.available_sheets?.length) {
        setSelectedSheet(result.data.sheet_name || result.data.available_sheets[0])
      }

      if (result.data.transactions.length > 0) {
        const currentMappings = initializeMappings(result.data.categories)
        console.log('Mappings iniciales:', currentMappings)

        if (aiAssistantEnabled) {
          const logs: string[] = []

          // Track description-based mappings for transactions without bank categories
          const descriptionMappings: MappingState = {}

          for (let i = 0; i < result.data.transactions.length; i++) {
            const tx = result.data.transactions[i]
            const hasBankCategory = tx.bank_category && tx.bank_category.trim() !== ''

            // Use bank category key if available, otherwise use description-based key
            const bankKey = `${tx.bank_category}|${tx.bank_subcategory}`
            const descKey = `desc:${normalizeText(tx.description).substring(0, 50)}`
            const key = hasBankCategory ? bankKey : descKey

            // Check if this key already has a mapping
            const existingMapping = hasBankCategory ? currentMappings[bankKey] : descriptionMappings[descKey]

            if (!existingMapping) {
              console.log(`AI analizando: "${tx.description.substring(0, 40)}..."`)
              const aiResult = await categorizeWithAI([{ description: tx.description, date: tx.date, amount: tx.amount }])

              if (aiResult.length > 0) {
                const aiCat = aiResult[0]

                // Synonym mapping for common Spanish financial terms
                const SYNONYMS: Record<string, string[]> = {
                  'luz': ['electricidad', 'electrica', 'electrico', 'energia'],
                  'electricidad': ['luz', 'electrica', 'electrico', 'energia'],
                  'gasolina': ['combustible', 'carburante', 'gasolinera'],
                  'combustible': ['gasolina', 'carburante', 'gasolinera'],
                  'agua': ['fontaneria', 'hidrico'],
                  'internet': ['telefono', 'movil', 'fibra', 'telecomunicaciones'],
                  'telefono': ['internet', 'movil', 'fibra', 'telecomunicaciones'],
                  'supermercado': ['alimentacion', 'compras', 'mercado'],
                  'alimentacion': ['supermercado', 'compras', 'mercado', 'comida'],
                  'restaurante': ['comida', 'cena', 'almuerzo', 'bar'],
                  'hogar': ['vivienda', 'casa', 'domicilio'],
                  'vivienda': ['hogar', 'casa', 'domicilio'],
                  'transporte': ['vehiculo', 'coche', 'auto'],
                  'ocio': ['entretenimiento', 'diversion'],
                  'entretenimiento': ['ocio', 'diversion'],
                }

                // Expand AI terms with synonyms
                const baseTerms = [aiCat.category, aiCat.subcategory].filter(Boolean).map(t => normalizeText(t))
                const aiTerms = new Set(baseTerms)
                baseTerms.forEach(term => {
                  // Add synonyms for each term
                  Object.entries(SYNONYMS).forEach(([key, synonyms]) => {
                    if (term.includes(key) || key.includes(term)) {
                      synonyms.forEach(syn => aiTerms.add(syn))
                      aiTerms.add(key)
                    }
                  })
                })
                const expandedTerms = Array.from(aiTerms)

                // Search through all categories and subcategories to find best match
                let appCategory: typeof categoryList[0] | undefined
                let appSubcategory: { id: string; name: string } | undefined

                // First, search for matching subcategory (more specific)
                for (const cat of categoryList) {
                  if (cat.subcategories) {
                    for (const sub of cat.subcategories) {
                      const subNorm = normalizeText(sub.name)
                      if (expandedTerms.some(term => subNorm.includes(term) || term.includes(subNorm))) {
                        appCategory = cat
                        appSubcategory = sub
                        break
                      }
                    }
                  }
                  if (appSubcategory) break
                }

                // If no subcategory match, try category name match
                if (!appCategory) {
                  appCategory = categoryList.find(c => {
                    const catNorm = normalizeText(c.name)
                    return expandedTerms.some(term => catNorm.includes(term) || term.includes(catNorm))
                  })
                }

                if (appCategory) {
                  // If we didn't find subcategory in the search above, try to match AI's suggestion
                  if (!appSubcategory && aiCat.subcategory && appCategory.subcategories) {
                    appSubcategory = appCategory.subcategories.find(s =>
                      normalizeText(s.name).includes(normalizeText(aiCat.subcategory)) ||
                      normalizeText(aiCat.subcategory).includes(normalizeText(s.name))
                    )
                  }

                  // Use matched subcategory, or first subcategory of category as fallback
                  const finalSubcategory = appSubcategory || appCategory.subcategories?.[0]
                  const mappedId = finalSubcategory?.id || null

                  if (mappedId) {
                    if (hasBankCategory) {
                      currentMappings[bankKey] = mappedId
                    } else {
                      descriptionMappings[descKey] = mappedId
                      tx.bank_category = appCategory.name
                      tx.bank_subcategory = finalSubcategory?.name || ''
                      const newKey = `${tx.bank_category}|${tx.bank_subcategory}`
                      currentMappings[newKey] = mappedId
                    }
                    logs.push(`✅ "${tx.description.substring(0, 35)}..." → ${appCategory.name}/${finalSubcategory?.name}`)
                  } else {
                    logs.push(`⚠️ "${tx.description.substring(0, 35)}..." → ${appCategory.name} (sin subcategorías)`)
                  }
                } else {
                  logs.push(`⚠️ "${tx.description.substring(0, 35)}..." → ${aiCat.category}/${aiCat.subcategory} (no encontrado en app)`)
                }
              }
            } else if (!hasBankCategory && descriptionMappings[descKey]) {
              // Apply existing description mapping to transaction
              const existingAiCat = Object.keys(currentMappings).find(k => currentMappings[k] === descriptionMappings[descKey])
              if (existingAiCat && existingAiCat !== 'null|null') {
                const [cat, subcat] = existingAiCat.split('|')
                tx.bank_category = cat
                tx.bank_subcategory = subcat || ''
              }
            }
          }

          if (logs.length > 0) {
            setAiActivityLog(logs)
            setAiUsedInBackground(true)
            setMappings(currentMappings)
          }
        }

        setStep('preview')
      } else if (aiAssistantEnabled) {
        console.log('No se encontraron transacciones, intentando con AI...')
        const aiResult = await parseWithAI(selectedFile)

        if (aiResult && aiResult.transactions.length > 0) {
          setParseResult(aiResult)
          initializeMappings(aiResult.categories)
          setStep('preview')
          setAiUsedInBackground(true)
        } else {
          setError('No se encontraron transacciones en el archivo')
        }
      } else {
        setError('No se encontraron transacciones en el archivo')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSheetChange = async (sheetName: string) => {
    if (!file) return
    setSelectedSheet(sheetName)
    setIsLoading(true)
    setError(null)

    try {
      const result = await importApi.parse(file, sheetName)
      setParseResult(result.data)
      if (result.data.success) {
        initializeMappings(result.data.categories)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  // Keyword mappings: bank keywords → app category/subcategory keywords
  // Order matters: more specific matches should come first
  const KEYWORD_MAPPINGS: { keywords: string[]; category: string; subcategory?: string }[] = [
    // Supermercado / Alimentación
    { keywords: ['supermercado', 'alimentacion', 'alimentación', 'mercadona', 'carrefour', 'lidl', 'aldi', 'dia', 'experos', 'hipercor', 'eroski', 'consum'], category: 'supermercado', subcategory: 'alimentacion' },
    { keywords: ['ropa', 'complementos', 'vestir', 'zara', 'hm', 'primark', 'mango', 'pull', 'bershka', 'stradivarius'], category: 'supermercado', subcategory: 'ropa' },
    { keywords: ['limpieza', 'drogueria'], category: 'supermercado', subcategory: 'limpieza' },
    // Ocio y viajes
    { keywords: ['restaurante', 'cafeteria', 'cafe', 'comida fuera', 'cena', 'almuerzo', 'barullo', 'mcdonalds', 'burger', 'telepizza', 'dominos'], category: 'ocio', subcategory: 'restaurantes' },
    { keywords: ['bar', 'cerveza', 'copa', 'pub'], category: 'ocio', subcategory: 'bares' },
    { keywords: ['juguete', 'jugueteria', 'regalo', 'toys', 'regalos'], category: 'ocio', subcategory: 'regalos' },
    { keywords: ['vacacion', 'viaje', 'hotel', 'vuelo', 'airbnb', 'booking', 'ocio y viajes'], category: 'ocio', subcategory: 'vacaciones' },
    { keywords: ['cine', 'teatro', 'concierto', 'espectaculo', 'entrada', 'netflix', 'spotify', 'hbo', 'disney'], category: 'ocio', subcategory: 'espectaculos' },
    { keywords: ['deporte', 'gimnasio', 'fitness', 'padel', 'tenis', 'futbol', 'decathlon'], category: 'ocio', subcategory: 'deporte' },
    // Transporte / Vehículo
    { keywords: ['gasolina', 'combustible', 'gasolinera', 'repsol', 'cepsa', 'bp', 'shell', 'galp', 'vehiculo', 'vehículo'], category: 'transporte', subcategory: 'combustible' },
    { keywords: ['taxi', 'uber', 'cabify', 'bus', 'tren', 'metro', 'transporte publico', 'renfe', 'avanza'], category: 'transporte', subcategory: 'taxi' },
    { keywords: ['parking', 'garage', 'aparcamiento'], category: 'transporte', subcategory: 'garage' },
    { keywords: ['taller', 'mecanico', 'itv', 'mantenimiento auto', 'neumatico', 'norauto', 'midas'], category: 'transporte', subcategory: 'mantenimiento' },
    // Vivienda / Hogar
    { keywords: ['hogar', 'casa', 'vivienda', 'mueble', 'ikea', 'decoracion', 'leroy', 'bricomart'], category: 'vivienda', subcategory: 'muebles' },
    { keywords: ['electrodomestico', 'media markt', 'worten', 'el corte ingles electronica'], category: 'vivienda', subcategory: 'electrodomesticos' },
    { keywords: ['reparacion', 'fontanero', 'electricista', 'reforma'], category: 'vivienda', subcategory: 'reparaciones' },
    // Gastos Fijos
    { keywords: ['luz', 'electricidad', 'endesa', 'iberdrola', 'naturgy'], category: 'gastos fijos', subcategory: 'luz' },
    { keywords: ['agua', 'canal', 'emasa', 'aguas'], category: 'gastos fijos', subcategory: 'agua' },
    { keywords: ['internet', 'fibra', 'movistar', 'vodafone', 'orange', 'telefono', 'digi', 'masmovil', 'jazztel'], category: 'gastos fijos', subcategory: 'internet' },
    { keywords: ['hipoteca', 'prestamo vivienda'], category: 'gastos fijos', subcategory: 'hipoteca' },
    { keywords: ['comunidad', 'vecinos'], category: 'gastos fijos', subcategory: 'comunidad' },
    // Salud / Educación y salud
    { keywords: ['farmacia', 'medicina', 'medicamento', 'herbolario', 'nutricion', 'educacion y salud'], category: 'salud', subcategory: 'farmacia' },
    { keywords: ['medico', 'hospital', 'clinica', 'dentista', 'oculista'], category: 'salud', subcategory: 'obra social' },
    { keywords: ['peluqueria', 'estetica', 'belleza', 'cuidado personal'], category: 'salud', subcategory: 'cuidado personal' },
    // Efectivo / Otros gastos
    { keywords: ['cajero', 'efectivo', 'atm', 'retirada'], category: 'efectivo', subcategory: 'cajero' },
    { keywords: ['bizum'], category: 'efectivo', subcategory: 'bizum' },
    { keywords: ['transferencia', 'otros gastos', 'revolut', 'paypal', 'wise'], category: 'efectivo', subcategory: 'transferencias' },
    // Ingresos / Ventajas
    { keywords: ['nomina', 'salario', 'sueldo', 'pago empresa'], category: 'ingresos', subcategory: 'nomina' },
    { keywords: ['ingreso', 'abono', 'devolucion', 'ventajas', 'incentivo', 'bonificacion'], category: 'ingresos', subcategory: 'otros ingresos' },
    // Seguros
    { keywords: ['seguro', 'mapfre', 'axa', 'allianz', 'generali', 'sanitas', 'adeslas'], category: 'seguros' },
    // Formación
    { keywords: ['colegio', 'escuela', 'instituto', 'universidad', 'educacion'], category: 'formacion', subcategory: 'colegio' },
    { keywords: ['libro', 'material escolar', 'papeleria'], category: 'formacion', subcategory: 'libros' },
    { keywords: ['curso', 'formacion', 'academia', 'udemy', 'coursera'], category: 'formacion', subcategory: 'cursos' },
    // Compras genéricas (ING)
    { keywords: ['compras'], category: 'supermercado' },
  ]

  const findBestMatch = (
    fileCat: { category: string; subcategory: string },
    categoryList: Category[]
  ): string | null => {
    const bankText = normalizeText(`${fileCat.category} ${fileCat.subcategory}`)

    // Debug log
    console.log('findBestMatch:', { bankText, categoryListLength: categoryList.length, fileCat })

    // 1. Try keyword matching first
    for (const mapping of KEYWORD_MAPPINGS) {
      const hasKeyword = mapping.keywords.some((kw) => bankText.includes(normalizeText(kw)))
      if (hasKeyword) {
        // Find the app category
        const appCat = categoryList.find(
          (c) => normalizeText(c.name).includes(normalizeText(mapping.category))
        )
        if (appCat?.subcategories) {
          // If we have a subcategory hint, find it
          if (mapping.subcategory) {
            const sub = appCat.subcategories.find((s) =>
              normalizeText(s.name).includes(normalizeText(mapping.subcategory!))
            )
            if (sub) return sub.id
          }
          // Otherwise return first subcategory
          if (appCat.subcategories.length > 0) {
            return appCat.subcategories[0].id
          }
        }
      }
    }

    // 2. Fallback: exact/partial name matching
    const normalizedFileCat = normalizeText(fileCat.category)
    const normalizedFileSub = normalizeText(fileCat.subcategory)

    for (const appCat of categoryList) {
      const normalizedAppCat = normalizeText(appCat.name)

      // Exact match on category name
      if (normalizedAppCat === normalizedFileCat) {
        if (appCat.subcategories) {
          for (const sub of appCat.subcategories) {
            if (normalizeText(sub.name) === normalizedFileSub) {
              return sub.id
            }
          }
          if (appCat.subcategories.length > 0) {
            return appCat.subcategories[0].id
          }
        }
      }

      // Partial match on category
      if (normalizedAppCat.includes(normalizedFileCat) || normalizedFileCat.includes(normalizedAppCat)) {
        if (appCat.subcategories) {
          for (const sub of appCat.subcategories) {
            const normalizedSub = normalizeText(sub.name)
            if (normalizedSub.includes(normalizedFileSub) || normalizedFileSub.includes(normalizedSub)) {
              return sub.id
            }
          }
          if (appCat.subcategories.length > 0) {
            return appCat.subcategories[0].id
          }
        }
      }

      // Search in all subcategories
      if (fileCat.subcategory && appCat.subcategories) {
        for (const sub of appCat.subcategories) {
          const normalizedSub = normalizeText(sub.name)
          if (normalizedSub.includes(normalizedFileSub) || normalizedFileSub.includes(normalizedSub)) {
            return sub.id
          }
        }
      }
    }

    return null
  }

  const initializeMappings = (fileCategories: { category: string; subcategory: string }[]): MappingState => {
    console.log('=== INICIALIZANDO MAPPINGS ===')
    console.log('Categorías del archivo:', fileCategories)
    console.log('Categorías de la app (categoryList):', categoryList.length)

    const initialMappings: MappingState = {}

    const savedMappingsMap = new Map<string, string>()
    savedMappings.forEach((m) => {
      const key = `${m.bank_category}|${m.bank_subcategory}`
      savedMappingsMap.set(key, m.subcategory_id)
    })

    fileCategories.forEach((fileCat) => {
      const key = `${fileCat.category}|${fileCat.subcategory}`

      if (savedMappingsMap.has(key)) {
        initialMappings[key] = savedMappingsMap.get(key)!
      } else {
        initialMappings[key] = findBestMatch(fileCat, categoryList)
      }
    })

    console.log('Mappings finales:', initialMappings)
    setMappings(initialMappings)
    return initialMappings
  }

  // Re-calcular mappings cuando las categorías de la app o savedMappings estén disponibles
  useEffect(() => {
    if (parseResult?.categories && categoryList.length > 0) {
      console.log('useEffect triggered: recalculating mappings with', categoryList.length, 'categories')
      initializeMappings(parseResult.categories)
    }
  }, [categoryList, savedMappings, parseResult?.categories])

  // Estadísticas de mapeo
  const mappingStats = useMemo(() => {
    const total = Object.keys(mappings).length
    const mapped = Object.values(mappings).filter((v) => v !== null).length
    return { total, mapped, pending: total - mapped }
  }, [mappings])

  const handleMappingChange = (key: string, subcategoryId: string | null) => {
    setMappings((prev) => ({ ...prev, [key]: subcategoryId }))
  }

  const handleConfirmImport = async () => {
    if (!account || !parseResult) return

    setIsLoading(true)
    setError(null)

    try {
      const categoryMappings: CategoryMapping[] = Object.entries(mappings).map(
        ([key, subcategory_id]) => {
          const [bank_category, bank_subcategory] = key.split('|')
          return { bank_category, bank_subcategory, subcategory_id }
        }
      )

      const result = await importApi.confirm({
        account_id: account.id,
        transactions: parseResult.transactions,
        category_mappings: categoryMappings,
      })

      setImportResult(result.data)
      setStep('result')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetImport = () => {
    setStep('upload')
    setFile(null)
    setParseResult(null)
    setSelectedSheet('')
    setMappings({})
    setError(null)
    setImportResult(null)
  }

  const subcategoryOptions = getSubcategoryOptions(singleForm.category_id)

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Importar Transacciones</h1>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-8">
        {[
          { id: 'single', label: 'Individual', icon: Plus },
          { id: 'batch', label: 'Por lotes (2-10)', icon: FileSpreadsheet },
          { id: 'bulk', label: 'Masivo (archivo)', icon: Upload },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setImportMode(id as ImportMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              importMode === id
                ? 'bg-accent text-white'
                : 'bg-layer-2 text-text-secondary hover:bg-layer-3 hover:text-text-primary'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-success">Éxito</p>
            <p className="text-sm text-text-secondary">{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-danger">Error</p>
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
        </div>
      )}

      {/* Mode: Single */}
      {importMode === 'single' && (
        <Card>
          <CardContent className="py-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Añadir transacción individual</h2>

            <div className="space-y-4">
              <Input
                label="Descripción"
                placeholder="Ej: Compra supermercado"
                value={singleForm.description}
                onChange={(e) => handleSingleFormChange('description', e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Fecha"
                  type="date"
                  value={singleForm.date}
                  onChange={(e) => handleSingleFormChange('date', e.target.value)}
                  required
                />
                <Input
                  label="Importe"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={singleForm.amount}
                  onChange={(e) => handleSingleFormChange('amount', e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="singleType"
                    checked={singleForm.type === 'expense'}
                    onChange={() => handleSingleFormChange('type', 'expense')}
                    className="w-4 h-4 text-danger"
                  />
                  <span className="text-sm text-text-primary">Gasto</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="singleType"
                    checked={singleForm.type === 'income'}
                    onChange={() => handleSingleFormChange('type', 'income')}
                    className="w-4 h-4 text-success"
                  />
                  <span className="text-sm text-text-primary">Ingreso</span>
                </label>
              </div>

              <Select
                label="Categoría"
                options={categoryOptions}
                value={singleForm.category_id}
                onChange={(e) => handleSingleCategoryChange(e.target.value)}
              />

              {singleForm.category_id && (
                <Select
                  label="Subcategoría"
                  options={getSubcategoryOptions(singleForm.category_id)}
                  value={singleForm.subcategory_id}
                  onChange={(e) => handleSingleFormChange('subcategory_id', e.target.value)}
                />
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={handleSingleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar transacción
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mode: Batch */}
      {importMode === 'batch' && (
        <Card>
          <CardContent className="py-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Añadir transacciones por lotes ({batchForms.length}/10)
              </h2>
              <Button
                variant="outline"
                onClick={addBatchRow}
                disabled={batchForms.length >= 10}
              >
                <Plus className="h-4 w-4 mr-2" />
                Añadir fila
              </Button>
            </div>

            {batchStep === 'input' ? (
              <div className="space-y-4">
                {batchForms.map((form, index) => (
                  <div key={index} className="p-4 border border-layer-3 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-text-primary">Transacción {index + 1}</h3>
                      {batchForms.length > 2 && (
                        <Button variant="ghost" size="sm" onClick={() => removeBatchRow(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <Input
                      label="Descripción"
                      placeholder="Ej: Compra supermercado"
                      value={form.description}
                      onChange={(e) => handleBatchFormChange(index, 'description', e.target.value)}
                      required
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Fecha"
                        type="date"
                        value={form.date}
                        onChange={(e) => handleBatchFormChange(index, 'date', e.target.value)}
                        required
                      />
                      <Input
                        label="Importe"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(e) => handleBatchFormChange(index, 'amount', e.target.value)}
                        required
                      />
                    </div>

                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={form.type === 'expense'}
                          onChange={() => handleBatchFormChange(index, 'type', 'expense')}
                          className="w-4 h-4 text-danger"
                        />
                        <span className="text-sm text-text-primary">Gasto</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={form.type === 'income'}
                          onChange={() => handleBatchFormChange(index, 'type', 'income')}
                          className="w-4 h-4 text-success"
                        />
                        <span className="text-sm text-text-primary">Ingreso</span>
                      </label>
                    </div>

                    <Select
                      label="Categoría"
                      options={categoryOptions}
                      value={form.category_id}
                      onChange={(e) => handleBatchCategoryChange(index, e.target.value)}
                    />

                    {form.category_id && (
                      <Select
                        label="Subcategoría"
                        options={getSubcategoryOptions(form.category_id)}
                        value={form.subcategory_id}
                        onChange={(e) => handleBatchFormChange(index, 'subcategory_id', e.target.value)}
                      />
                    )}
                  </div>
                ))}

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={resetBatchForms}>
                    Limpiar todo
                  </Button>
                  <Button onClick={() => setBatchStep('review')} disabled={isLoading}>
                    Continuar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-medium text-text-primary mb-4">Revisar transacciones ({batchForms.length})</h3>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {batchForms.map((form, index) => (
                    <div key={index} className="p-3 bg-layer-1 rounded flex justify-between items-center">
                      <div>
                        <p className="font-medium text-text-primary">{form.description || 'Sin descripción'}</p>
                        <p className="text-sm text-text-secondary">
                          {form.date} • {form.amount || '0'} € • {form.type === 'expense' ? 'Gasto' : 'Ingreso'}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setBatchStep('input')}>
                        Editar
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setBatchStep('input')} disabled={isLoading}>
                    Atrás
                  </Button>
                  <Button onClick={handleBatchSubmit} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar {batchForms.length} transacciones
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mode: Bulk (existing) */}
      {importMode === 'bulk' && (
        <>
          {/* AI Assistant Toggle */}
          <div className="flex items-center justify-between p-4 bg-layer-1 rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-text-primary">Asistente IA</p>
                <p className="text-sm text-text-secondary">
                  Ayuda con archivos complejos o mal formados
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiAssistantEnabled}
                onChange={(e) => setAiAssistantEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-layer-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          {/* AI Used Notification */}
          {aiUsedInBackground && (
            <div className="mb-6 p-4 bg-accent/5 border border-accent/20 rounded-lg animate-in slide-in-from-bottom">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-accent flex-shrink-0" />
                  <div>
                    <p className="font-medium text-text-primary">
                      Asistente IA ha categorizado transacciones
                    </p>
                    <p className="text-sm text-text-secondary">
                      Basado en el análisis de las descripciones
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAiUsedInBackground(false)
                    setAiActivityLog([])
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* AI Activity Log */}
              {aiActivityLog.length > 0 && (
                <div className="bg-layer-1 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <p className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">
                    Actividad del asistente
                  </p>
                  <ul className="space-y-1">
                    {aiActivityLog.map((log, idx) => (
                      <li key={idx} className="text-sm text-text-primary font-mono">
                        {log}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-8">
            {(['upload', 'preview', 'mapping', 'result'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-accent text-white'
                      : i < ['upload', 'preview', 'mapping', 'result'].indexOf(step)
                        ? 'bg-success text-white'
                        : 'bg-layer-2 text-text-secondary'
                  }`}
                >
                  {i + 1}
                </div>
                {i < 3 && (
                  <div
                    className={`w-8 h-0.5 ${
                      i < ['upload', 'preview', 'mapping', 'result'].indexOf(step)
                        ? 'bg-success'
                        : 'bg-layer-3'
                    }`}
                  />
                )}
              </div>
            ))}
            <div className="ml-4 text-sm text-text-secondary">
              {step === 'upload' && 'Subir archivo'}
              {step === 'preview' && 'Vista previa'}
              {step === 'mapping' && 'Mapear categorías'}
              {step === 'result' && 'Resultado'}
            </div>
          </div>

          {/* Step: Upload */}
          {step === 'upload' && (
            <Card>
              <CardContent className="py-12">
                <div
                  className="border-2 border-dashed border-layer-3 rounded-xl p-12 text-center hover:border-accent/50 transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-12 w-12 text-accent animate-spin" />
                      <p className="text-text-secondary">Procesando archivo...</p>
                    </div>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                      <p className="text-text-primary font-medium mb-2">
                        Arrastra tu archivo Excel aquí
                      </p>
                      <p className="text-sm text-text-secondary mb-4">o haz clic para seleccionar</p>
                      <p className="text-xs text-text-secondary">
                        Formatos Excel aceptados: .xlsx, .xls y .csv
                      </p>
                    </>
                  )}
                  <input
                    id="file-input"
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFileSelect(f)
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Preview */}
          {step === 'preview' && parseResult && (
        <div className="space-y-6">
          {/* File info */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-accent" />
                  <div>
                    <p className="font-medium text-text-primary">{file?.name}</p>
                    <p className="text-sm text-text-secondary">
                      Tipo:{' '}
                      {parseResult.file_type === 'control_gastos'
                        ? 'Control de Gastos'
                        : parseResult.file_type === 'csv_revolut'
                          ? 'CSV Revolut'
                          : parseResult.file_type === 'csv_generic'
                            ? 'CSV Genérico'
                            : parseResult.file_type === 'ai_parsed'
                              ? 'Parseado con IA'
                              : 'Movimientos CC'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={resetImport}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Sheet selector for Control de Gastos */}
              {parseResult.file_type === 'control_gastos' && parseResult.available_sheets && (
                <div className="mt-4">
                  <Select
                    label="Hoja del mes"
                    options={parseResult.available_sheets.map((s) => ({ value: s, label: s }))}
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transactions preview */}
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b border-layer-3">
                <h3 className="font-medium text-text-primary">
                  Vista previa ({parseResult.transactions.length} transacciones)
                </h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-layer-1 sticky top-0">
                    <tr className="border-b border-layer-3">
                      <th className="text-left py-2 px-4 text-text-secondary font-medium">Fecha</th>
                      <th className="text-left py-2 px-4 text-text-secondary font-medium">
                        Descripción
                      </th>
                      <th className="text-left py-2 px-4 text-text-secondary font-medium">
                        Categoría
                      </th>
                      <th className="text-right py-2 px-4 text-text-secondary font-medium">
                        Importe
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.transactions.slice(0, 50).map((tx, i) => (
                      <tr key={i} className="border-b border-layer-2 hover:bg-layer-1">
                        <td className="py-2 px-4 text-text-primary">{tx.date}</td>
                        <td className="py-2 px-4 text-text-primary truncate max-w-[200px]">
                          {tx.description}
                        </td>
                        <td className="py-2 px-4">
                          <span className="text-xs text-text-secondary">
                            {tx.bank_category}
                            {tx.bank_subcategory && ` → ${tx.bank_subcategory}`}
                          </span>
                        </td>
                        <td
                          className={`py-2 px-4 text-right font-medium ${
                            tx.amount >= 0 ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {tx.amount >= 0 ? '+' : ''}
                          {tx.amount.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parseResult.transactions.length > 50 && (
                  <div className="p-4 text-center text-sm text-text-secondary bg-layer-1">
                    ... y {parseResult.transactions.length - 50} transacciones más
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetImport}>
              Cancelar
            </Button>
            <Button onClick={() => setStep('mapping')}>
              Siguiente: Mapear categorías
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Mapping */}
      {step === 'mapping' && parseResult && (
        <div className="space-y-6">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-text-primary">Mapeo de categorías</h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-success">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    {mappingStats.mapped} mapeadas
                  </span>
                  {mappingStats.pending > 0 && (
                    <span className="text-warning">{mappingStats.pending} sin asignar</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-text-secondary">
                Se han mapeado automáticamente las categorías coincidentes. Puedes modificar
                cualquier asignación manualmente.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-layer-2">
                {parseResult.categories.map((cat) => {
                  const key = `${cat.category}|${cat.subcategory}`
                  const isMapped = mappings[key] !== null
                  return (
                    <div
                      key={key}
                      className={`p-4 flex items-center gap-4 ${
                        isMapped ? 'bg-success/5' : 'bg-warning/5'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isMapped ? 'bg-success' : 'bg-warning'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">{cat.category}</p>
                        {cat.subcategory && (
                          <p className="text-sm text-text-secondary truncate">{cat.subcategory}</p>
                        )}
                      </div>
                      <ArrowRight
                        className={`h-4 w-4 flex-shrink-0 ${
                          isMapped ? 'text-success' : 'text-text-secondary'
                        }`}
                      />
                      <div className="w-72">
                        <Select
                          options={allSubcategoryOptions}
                          value={mappings[key] || ''}
                          onChange={(e) => handleMappingChange(key, e.target.value || null)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep('preview')}>
              Atrás
            </Button>
            <Button onClick={handleConfirmImport} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {parseResult.transactions.length} transacciones
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && importResult && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text-primary mb-2">Importación completada</h2>
            <div className="space-y-1 mb-6">
              <p className="text-text-secondary">
                <span className="font-medium text-success">{importResult.inserted}</span>{' '}
                transacciones importadas
              </p>
              {importResult.skipped > 0 && (
                <p className="text-text-secondary">
                  <span className="font-medium text-warning">{importResult.skipped}</span>{' '}
                  transacciones omitidas
                </p>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="mb-6 p-4 bg-warning/10 rounded-lg text-left">
                <p className="font-medium text-warning mb-2">Errores:</p>
                <ul className="text-sm text-text-secondary space-y-1">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={resetImport}>
                Importar más
              </Button>
              <Button onClick={() => (window.location.href = '/transactions')}>
                Ver transacciones
              </Button>
            </div>
            </CardContent>
          </Card>
        )}
        </>
      )}
    </div>
  )
}
