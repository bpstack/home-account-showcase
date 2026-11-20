// Made-up figures for the video. One household, one month (November 2026), told the same way
// in every scene.

import { CATEGORY_COLORS as C } from '../design/theme'

export const PERIOD = 'Noviembre 2026'

export const FIGURES = { income: 3950, expenses: 2187.4 }

export const EXPENSES_BY_CATEGORY = [
  { name: 'Vivienda', color: C.home, amount: 850 },
  { name: 'Alimentación', color: C.food, amount: 486.3 },
  { name: 'Transporte', color: C.transport, amount: 212.6 },
  { name: 'Ocio', color: C.leisure, amount: 184.5 },
  { name: 'Salud', color: C.health, amount: 96.2 },
  { name: 'Compras', color: C.shopping, amount: 357.8 },
].sort((a, b) => b.amount - a.amount)

export interface Tx {
  /** YYYY-MM-DD */
  day: string
  concept: string
  category: string
  color: string
  amount: number
}

export const TRANSACTIONS: Tx[] = [
  { day: '2026-11-18', concept: 'Mercadona', category: 'Alimentación / Supermercado', color: C.food, amount: -64.35 },
  { day: '2026-11-18', concept: 'Bizum de Laura', category: 'Ingresos / Bizum', color: C.income, amount: 25 },
  { day: '2026-11-17', concept: 'Gasolinera Repsol', category: 'Transporte / Combustible', color: C.transport, amount: -58.2 },
  { day: '2026-11-16', concept: 'Cine Yelmo', category: 'Ocio / Cine', color: C.leisure, amount: -21.8 },
  { day: '2026-11-15', concept: 'Lidl', category: 'Alimentación / Supermercado', color: C.food, amount: -41.9 },
  { day: '2026-11-14', concept: 'Farmacia Central', category: 'Salud / Farmacia', color: C.health, amount: -18.45 },
  { day: '2026-11-12', concept: 'Panadería La Espiga', category: 'Alimentación / Panadería', color: C.food, amount: -9.6 },
  { day: '2026-11-10', concept: 'Nómina noviembre', category: 'Ingresos / Nómina', color: C.income, amount: 2450 },
  { day: '2026-11-08', concept: 'Frutería del barrio', category: 'Alimentación / Fruta', color: C.food, amount: -17.25 },
]

export const ACCOUNTS = [
  { name: 'Personal', initial: 'P', role: 'Propietario', income: 2450, expenses: 1318.75 },
  { name: 'Casa', initial: 'C', role: 'Propietario', income: 3950, expenses: 2187.4 },
  { name: 'Viaje a Japón', initial: 'V', role: 'Miembro', income: 600, expenses: 145.9 },
]

export const IMPORT_FILE = 'extracto_noviembre.xlsx'

export const IMPORT_PREVIEW = [
  { date: '18/11/2026', concept: 'COMPRA MERCADONA 2841', bank: 'Supermercados', amount: -64.35 },
  { date: '17/11/2026', concept: 'REPSOL E.S. 0193', bank: 'Carburantes', amount: -58.2 },
  { date: '16/11/2026', concept: 'YELMO CINES', bank: 'Ocio', amount: -21.8 },
  { date: '15/11/2026', concept: 'LIDL SUPERMERCADOS', bank: 'Supermercados', amount: -41.9 },
  { date: '10/11/2026', concept: 'NOMINA EMPRESA SL', bank: 'Nómina', amount: 2450 },
]

export const IMPORT_MAPPING = [
  { bank: 'Supermercados', count: 18, target: 'Alimentación / Supermercado' },
  { bank: 'Carburantes', count: 6, target: 'Transporte / Combustible' },
  { bank: 'Ocio', count: 9, target: 'Ocio / Restaurantes' },
]

// The monthly plan for a balanced profile (frontend/lib/investment-plan.ts: 55 / 40 / 5)
export const MONTHLY_AVG = { income: 3820, expenses: 2240 }

export const PLAN = {
  total: 948,
  share: 60,
  allocation: [
    { label: 'Acciones', value: 55, color: '#3fb2bc' },
    { label: 'Bonos', value: 40, color: 'rgba(63, 178, 188, 0.5)' },
    { label: 'Liquidez', value: 5, color: '#9aa3af' },
  ],
  items: [
    { name: 'iShares Core MSCI World UCITS ETF (Acc)', isin: 'IE00B4L5Y983', risk: 'riesgo medio', amount: 521.4, pct: 55 },
    { name: 'iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)', isin: 'IE00BDBRDM35', risk: 'riesgo bajo', amount: 379.2, pct: 40 },
    { name: 'Cuenta remunerada o fondo monetario', isin: null, risk: 'riesgo bajo', amount: 47.4, pct: 5 },
  ],
}

export const MARKETS = [
  { name: 'MSCI World', value: '3.912,40', change: '+0,6 %' },
  { name: 'S&P 500', value: '6.105,22', change: '+0,4 %' },
  { name: 'IBEX 35', value: '12.384,10', change: '−0,2 %' },
  { name: 'Euríbor 12 m', value: '2,21 %', change: '—' },
]

/** Expected value of a balanced portfolio: 10.000 € plus 300 € a month, yearly points. */
export const SIMULATION = {
  years: 10,
  pessimistic: [10000, 13300, 16800, 20500, 24300, 28300, 32500, 36900, 41500, 46200, 51100],
  expected: [10000, 13700, 17700, 22000, 26600, 31500, 36800, 42500, 48600, 55100, 62000],
  optimistic: [10000, 14100, 18700, 23700, 29100, 35000, 41500, 48600, 56300, 64700, 73900],
}

export const CHAT = {
  question: '¿Cómo reparto mi ahorro con un perfil equilibrado?',
  answer: [
    { kind: 'p', text: 'Con un perfil **equilibrado** se suele combinar crecimiento y estabilidad:' },
    { kind: 'li', text: '**Acciones globales** (55 %): el motor a largo plazo.' },
    { kind: 'li', text: '**Bonos** (40 %): amortiguan las caídas.' },
    { kind: 'li', text: '**Liquidez** (5 %): para imprevistos y oportunidades.' },
    { kind: 'p', text: 'Primero, completa tu **fondo de emergencia**: seis meses de gastos.' },
  ] as const,
  quickQuestions: ['¿Qué es un fondo indexado?', '¿Cómo funciona un ETF?', '¿Qué es el interés compuesto?'],
}

// 24 words from the BIP39 English list, as the app generates them
export const RECOVERY_WORDS = [
  'ocean', 'brave', 'sunset', 'crystal', 'tiger', 'dawn',
  'velvet', 'harbor', 'museum', 'gentle', 'orbit', 'canyon',
  'lemon', 'whisper', 'anchor', 'meadow', 'pilot', 'echo',
  'silver', 'garden', 'thunder', 'maple', 'voyage', 'pulse',
]
