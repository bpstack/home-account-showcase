// Mock Data - Home Account
// Datos ficticios basados en estructura real

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  subcategories: Subcategory[]
}

export interface Subcategory {
  id: string
  categoryId: string
  name: string
}

export interface Transaction {
  id: string
  subcategoryId: string | null
  date: string
  description: string
  amount: number
  bankCategory?: string
  bankSubcategory?: string
}

export interface User {
  id: string
  email: string
  name: string
}

export interface MonthlyBalance {
  month: string
  nomina1: number
  nomina2: number
  gastosFijos: number
  transferencias: number
  bizum: number
  bonificaciones: number
  otrosIngresos: number
  totalIngresos: number
  ahorro: number
  totalGastos: number
  saldoCC: number
}

// Usuario mock
export const mockUser: User = {
  id: 'usr_001',
  email: 'usuario@ejemplo.com',
  name: 'Usuario Demo',
}

// Categorías basadas en el Excel real
export const mockCategories: Category[] = [
  {
    id: 'cat_001',
    name: 'Supermercado',
    color: '#22c55e',
    icon: 'shopping-cart',
    subcategories: [
      { id: 'sub_001', categoryId: 'cat_001', name: 'Almacén' },
      { id: 'sub_002', categoryId: 'cat_001', name: 'Ropa o Complementos' },
      { id: 'sub_003', categoryId: 'cat_001', name: 'Carnicería' },
      { id: 'sub_004', categoryId: 'cat_001', name: 'Artículos Limpieza' },
      { id: 'sub_005', categoryId: 'cat_001', name: 'Alimentación' },
    ],
  },
  {
    id: 'cat_002',
    name: 'Gastos Fijos',
    color: '#3b82f6',
    icon: 'home',
    subcategories: [
      { id: 'sub_006', categoryId: 'cat_002', name: 'Luz' },
      { id: 'sub_007', categoryId: 'cat_002', name: 'IBIS' },
      { id: 'sub_008', categoryId: 'cat_002', name: 'Agua' },
      { id: 'sub_009', categoryId: 'cat_002', name: 'Internet' },
      { id: 'sub_010', categoryId: 'cat_002', name: 'Comunidad' },
      { id: 'sub_011', categoryId: 'cat_002', name: 'Hipoteca' },
    ],
  },
  {
    id: 'cat_003',
    name: 'Formación',
    color: '#8b5cf6',
    icon: 'book',
    subcategories: [
      { id: 'sub_012', categoryId: 'cat_003', name: 'Colegio-Comedor' },
      { id: 'sub_013', categoryId: 'cat_003', name: 'Material escolar' },
      { id: 'sub_014', categoryId: 'cat_003', name: 'Libros' },
      { id: 'sub_015', categoryId: 'cat_003', name: 'Extraescolares' },
      { id: 'sub_016', categoryId: 'cat_003', name: 'Cursos' },
      { id: 'sub_017', categoryId: 'cat_003', name: 'Inglés' },
    ],
  },
  {
    id: 'cat_004',
    name: 'Ocio',
    color: '#ec4899',
    icon: 'gamepad',
    subcategories: [
      { id: 'sub_018', categoryId: 'cat_004', name: 'Vacaciones' },
      { id: 'sub_019', categoryId: 'cat_004', name: 'Regalos' },
      { id: 'sub_020', categoryId: 'cat_004', name: 'Espectáculos' },
      { id: 'sub_021', categoryId: 'cat_004', name: 'Deporte' },
      { id: 'sub_022', categoryId: 'cat_004', name: 'Restaurantes' },
      { id: 'sub_023', categoryId: 'cat_004', name: 'Bares' },
    ],
  },
  {
    id: 'cat_005',
    name: 'Transporte',
    color: '#f59e0b',
    icon: 'car',
    subcategories: [
      { id: 'sub_024', categoryId: 'cat_005', name: 'Auto mantenimiento' },
      { id: 'sub_025', categoryId: 'cat_005', name: 'Combustible' },
      { id: 'sub_026', categoryId: 'cat_005', name: 'Garage' },
      { id: 'sub_027', categoryId: 'cat_005', name: 'Taxi/Bus/Tren' },
    ],
  },
  {
    id: 'cat_006',
    name: 'Vivienda',
    color: '#84cc16',
    icon: 'wrench',
    subcategories: [
      { id: 'sub_028', categoryId: 'cat_006', name: 'Muebles' },
      { id: 'sub_029', categoryId: 'cat_006', name: 'Electrodomésticos' },
      { id: 'sub_030', categoryId: 'cat_006', name: 'Reparaciones' },
      { id: 'sub_031', categoryId: 'cat_006', name: 'Jardinero' },
      { id: 'sub_032', categoryId: 'cat_006', name: 'Decoración' },
      { id: 'sub_033', categoryId: 'cat_006', name: 'Limpieza' },
    ],
  },
  {
    id: 'cat_007',
    name: 'Salud',
    color: '#ef4444',
    icon: 'heart',
    subcategories: [
      { id: 'sub_034', categoryId: 'cat_007', name: 'Obra Social' },
      { id: 'sub_035', categoryId: 'cat_007', name: 'Farmacia' },
      { id: 'sub_036', categoryId: 'cat_007', name: 'Cuidado Personal' },
      { id: 'sub_037', categoryId: 'cat_007', name: 'Gimnasio' },
    ],
  },
  {
    id: 'cat_008',
    name: 'Seguros',
    color: '#06b6d4',
    icon: 'shield',
    subcategories: [
      { id: 'sub_038', categoryId: 'cat_008', name: 'Vivienda' },
      { id: 'sub_039', categoryId: 'cat_008', name: 'Jubilación' },
      { id: 'sub_040', categoryId: 'cat_008', name: 'Vehículo' },
      { id: 'sub_041', categoryId: 'cat_008', name: 'Vida' },
    ],
  },
  {
    id: 'cat_009',
    name: 'Efectivo',
    color: '#64748b',
    icon: 'wallet',
    subcategories: [
      { id: 'sub_042', categoryId: 'cat_009', name: 'Cajero' },
      { id: 'sub_043', categoryId: 'cat_009', name: 'Bizum' },
      { id: 'sub_044', categoryId: 'cat_009', name: 'Transferencias' },
      { id: 'sub_045', categoryId: 'cat_009', name: 'Otros' },
    ],
  },
]

// Transacciones mock - Enero 2025 (basado en estructura real, datos ficticios)
export const mockTransactions: Transaction[] = [
  // Gastos Fijos
  { id: 'tx_001', subcategoryId: 'sub_010', date: '2025-01-02', description: 'COMUNIDAD', amount: -94.85 },
  { id: 'tx_002', subcategoryId: 'sub_011', date: '2025-01-01', description: 'HIPOTECA', amount: -576.25 },
  { id: 'tx_003', subcategoryId: 'sub_009', date: '2025-01-02', description: 'INTERNET FIBRA', amount: -64.90 },

  // Formación
  { id: 'tx_004', subcategoryId: 'sub_015', date: '2025-01-02', description: 'Recibo Academia extraescolar', amount: -35.02 },
  { id: 'tx_005', subcategoryId: 'sub_015', date: '2025-01-02', description: 'Material actividad', amount: -2.00 },
  { id: 'tx_006', subcategoryId: 'sub_017', date: '2025-01-02', description: 'CLASES INGLÉS', amount: -73.00 },
  { id: 'tx_007', subcategoryId: 'sub_012', date: '2025-01-08', description: 'Recibo comedor escolar', amount: -22.16 },

  // Supermercado / Alimentación
  { id: 'tx_008', subcategoryId: 'sub_005', date: '2025-01-02', description: 'Compra supermercado', amount: -5.50 },
  { id: 'tx_009', subcategoryId: 'sub_005', date: '2025-01-02', description: 'Compra alimentación', amount: -25.34 },
  { id: 'tx_010', subcategoryId: 'sub_005', date: '2025-01-04', description: 'Compra semanal', amount: -19.19 },
  { id: 'tx_011', subcategoryId: 'sub_005', date: '2025-01-12', description: 'Compra supermercado', amount: -89.16 },
  { id: 'tx_012', subcategoryId: 'sub_005', date: '2025-01-14', description: 'Compra supermercado', amount: -18.62 },
  { id: 'tx_013', subcategoryId: 'sub_005', date: '2025-01-14', description: 'Compra supermercado', amount: -16.67 },

  // Ropa
  { id: 'tx_014', subcategoryId: 'sub_002', date: '2025-01-02', description: 'Tienda ropa', amount: -72.95 },
  { id: 'tx_015', subcategoryId: 'sub_002', date: '2025-01-07', description: 'Compra ropa', amount: -133.03 },

  // Ocio
  { id: 'tx_016', subcategoryId: 'sub_019', date: '2025-01-01', description: 'REGALOS REYES', amount: -100.00 },
  { id: 'tx_017', subcategoryId: 'sub_019', date: '2025-01-02', description: 'REGALOS', amount: -31.28 },
  { id: 'tx_018', subcategoryId: 'sub_019', date: '2025-01-03', description: 'COMPRA ONLINE REGALOS', amount: -100.00 },
  { id: 'tx_019', subcategoryId: 'sub_023', date: '2025-01-05', description: 'Cafetería', amount: -6.80 },

  // Transporte
  { id: 'tx_020', subcategoryId: 'sub_027', date: '2025-01-05', description: 'Billete tren', amount: -3.20 },
  { id: 'tx_021', subcategoryId: 'sub_025', date: '2025-01-09', description: 'Gasolinera', amount: -58.88 },
  { id: 'tx_022', subcategoryId: 'sub_025', date: '2025-01-14', description: 'Repostaje', amount: -37.74 },

  // Efectivo
  { id: 'tx_023', subcategoryId: 'sub_043', date: '2025-01-01', description: 'Bizum cena fin de año', amount: -50.00 },

  // Seguros
  { id: 'tx_024', subcategoryId: 'sub_038', date: '2025-01-05', description: 'SEGURO VIVIENDA', amount: -32.42 },
  { id: 'tx_025', subcategoryId: 'sub_041', date: '2025-01-05', description: 'SEGURO VIDA', amount: -32.08 },

  // Sin categorizar
  { id: 'tx_026', subcategoryId: null, date: '2025-01-10', description: 'Pago pendiente revisar', amount: -15.00, bankCategory: 'Otros', bankSubcategory: 'Otros gastos' },
]

// Balance mensual (estructura similar al Excel)
export const mockMonthlyBalance: MonthlyBalance[] = [
  {
    month: 'Enero',
    nomina1: 2550.00,
    nomina2: 1521.51,
    gastosFijos: 825.62,
    transferencias: 1800.00,
    bizum: 15.00,
    bonificaciones: 7.60,
    otrosIngresos: 0,
    totalIngresos: 4169.73,
    ahorro: 961.92,
    totalGastos: 3207.81,
    saldoCC: 24890.81,
  },
  {
    month: 'Febrero',
    nomina1: 1290.00,
    nomina2: 1509.55,
    gastosFijos: 825.62,
    transferencias: 670.00,
    bizum: 45.00,
    bonificaciones: 7.66,
    otrosIngresos: 0,
    totalIngresos: 3057.83,
    ahorro: 405.60,
    totalGastos: 2652.23,
    saldoCC: 25296.41,
  },
  {
    month: 'Marzo',
    nomina1: 1290.00,
    nomina2: 1511.03,
    gastosFijos: 825.62,
    transferencias: 390.00,
    bizum: 5.03,
    bonificaciones: 0,
    otrosIngresos: 0,
    totalIngresos: 2731.68,
    ahorro: 145.70,
    totalGastos: 2585.98,
    saldoCC: 25442.10,
  },
  {
    month: 'Abril',
    nomina1: 1290.00,
    nomina2: 1512.34,
    gastosFijos: 825.62,
    transferencias: 1137.00,
    bizum: 10.61,
    bonificaciones: 0,
    otrosIngresos: 0,
    totalIngresos: 3485.57,
    ahorro: -17.79,
    totalGastos: 3503.36,
    saldoCC: 25424.31,
  },
  {
    month: 'Mayo',
    nomina1: 1290.00,
    nomina2: 1720.79,
    gastosFijos: 825.62,
    transferencias: 513.00,
    bizum: 4.68,
    bonificaciones: 78.82,
    otrosIngresos: 0,
    totalIngresos: 3142.91,
    ahorro: 703.42,
    totalGastos: 2439.49,
    saldoCC: 26127.72,
  },
  {
    month: 'Junio',
    nomina1: 1290.00,
    nomina2: 1534.54,
    gastosFijos: 825.62,
    transferencias: 440.00,
    bizum: 5.71,
    bonificaciones: 1398.91,
    otrosIngresos: 0,
    totalIngresos: 4204.78,
    ahorro: 788.60,
    totalGastos: 3416.18,
    saldoCC: 26916.32,
  },
  {
    month: 'Julio',
    nomina1: 2550.00,
    nomina2: 1521.08,
    gastosFijos: 825.62,
    transferencias: 1450.00,
    bizum: 7.42,
    bonificaciones: 0,
    otrosIngresos: 0,
    totalIngresos: 3804.12,
    ahorro: 408.21,
    totalGastos: 3395.91,
    saldoCC: 27324.53,
  },
  { month: 'Agosto', nomina1: 0, nomina2: 0, gastosFijos: 825.62, transferencias: 0, bizum: 0, bonificaciones: 0, otrosIngresos: 0, totalIngresos: 825.62, ahorro: 575.62, totalGastos: 250.00, saldoCC: 27900.14 },
  { month: 'Septiembre', nomina1: 0, nomina2: 0, gastosFijos: 825.62, transferencias: 0, bizum: 0, bonificaciones: 0, otrosIngresos: 0, totalIngresos: 825.62, ahorro: 825.62, totalGastos: 0, saldoCC: 28725.76 },
  { month: 'Octubre', nomina1: 0, nomina2: 0, gastosFijos: 0, transferencias: 0, bizum: 0, bonificaciones: 0, otrosIngresos: 0, totalIngresos: 0, ahorro: 0, totalGastos: 0, saldoCC: 0 },
  { month: 'Noviembre', nomina1: 0, nomina2: 0, gastosFijos: 0, transferencias: 0, bizum: 0, bonificaciones: 0, otrosIngresos: 0, totalIngresos: 0, ahorro: 0, totalGastos: 0, saldoCC: 0 },
  { month: 'Diciembre', nomina1: 0, nomina2: 0, gastosFijos: 0, transferencias: 0, bizum: 0, bonificaciones: 0, otrosIngresos: 0, totalIngresos: 0, ahorro: 0, totalGastos: 0, saldoCC: 0 },
]

// Helpers
export function getCategory(categoryId: string): Category | undefined {
  return mockCategories.find(c => c.id === categoryId)
}

export function getSubcategory(subcategoryId: string): Subcategory | undefined {
  for (const category of mockCategories) {
    const sub = category.subcategories.find(s => s.id === subcategoryId)
    if (sub) return sub
  }
  return undefined
}

export function getCategoryBySubcategory(subcategoryId: string): Category | undefined {
  return mockCategories.find(c =>
    c.subcategories.some(s => s.id === subcategoryId)
  )
}

// Estadísticas
export function getMonthlyStats(transactions: Transaction[]) {
  const income = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const expenses = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const balance = income - expenses

  return { income, expenses, balance }
}

export function getExpensesByCategory(transactions: Transaction[]) {
  const expenses = transactions.filter(t => t.amount < 0)
  const byCategory: Record<string, number> = {}

  for (const tx of expenses) {
    if (tx.subcategoryId) {
      const category = getCategoryBySubcategory(tx.subcategoryId)
      if (category) {
        byCategory[category.name] = (byCategory[category.name] || 0) + Math.abs(tx.amount)
      }
    } else {
      byCategory['Sin categorizar'] = (byCategory['Sin categorizar'] || 0) + Math.abs(tx.amount)
    }
  }

  return Object.entries(byCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
}
