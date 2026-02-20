// Mock financial data for video scenes

export const MONTHLY_DATA = [
  { month: 'Jul', income: 3200, expense: 1850 },
  { month: 'Ago', income: 3400, expense: 2100 },
  { month: 'Sep', income: 3100, expense: 1750 },
  { month: 'Oct', income: 3600, expense: 2200 },
  { month: 'Nov', income: 3300, expense: 1900 },
  { month: 'Dic', income: 3500, expense: 2050 },
]

export const CATEGORIES = [
  { name: 'Alimentación', value: 450, color: '#22c55e' },
  { name: 'Transporte', value: 280, color: '#3b82f6' },
  { name: 'Vivienda', value: 650, color: '#f59e0b' },
  { name: 'Ocio', value: 200, color: '#a855f7' },
  { name: 'Otros', value: 270, color: '#06b6d4' },
]

export const TRANSACTIONS = [
  { date: '15 Dic', description: 'Supermercado Lidl', category: 'Alimentación', amount: -67.30 },
  { date: '14 Dic', description: 'Nómina Empresa', category: 'Ingresos', amount: 3500.00 },
  { date: '13 Dic', description: 'Gasolinera Repsol', category: 'Transporte', amount: -55.20 },
  { date: '12 Dic', description: 'Netflix', category: 'Ocio', amount: -15.49 },
  { date: '11 Dic', description: 'Alquiler Diciembre', category: 'Vivienda', amount: -650.00 },
  { date: '10 Dic', description: 'Farmacia', category: 'Salud', amount: -23.80 },
  { date: '09 Dic', description: 'Restaurante La Plaza', category: 'Ocio', amount: -42.50 },
  { date: '08 Dic', description: 'Amazon', category: 'Compras', amount: -89.99 },
  { date: '07 Dic', description: 'Freelance diseño', category: 'Ingresos', amount: 450.00 },
  { date: '06 Dic', description: 'Mercadona', category: 'Alimentación', amount: -78.45 },
]

export const INVESTMENT_ALLOCATION = [
  { label: 'Acciones', value: 45, color: '#22c55e' },
  { label: 'Bonos', value: 30, color: '#3b82f6' },
  { label: 'Crypto', value: 10, color: '#f59e0b' },
  { label: 'Liquidez', value: 15, color: '#6b7280' },
]

export const RECOMMENDATIONS = [
  { name: 'MSCI World ETF', type: 'ETF', change: '+12.4%', risk: 'Moderado' },
  { name: 'Bonos Europeos Gov', type: 'Bonos', change: '+3.2%', risk: 'Bajo' },
  { name: 'Bitcoin', type: 'Crypto', change: '+28.7%', risk: 'Alto' },
]

export const MARKET_DATA = [
  { name: 'S&P 500', value: '5,234.18', change: '+1.2%', up: true },
  { name: 'Bitcoin', value: '€91,234', change: '+3.8%', up: true },
  { name: 'MSCI World', value: '3,456.78', change: '+0.7%', up: true },
]

export const SIMULATOR_POINTS = {
  conservative: [10000, 10200, 10350, 10500, 10700, 10900, 11100, 11350, 11500, 11700, 11900, 12100],
  balanced: [10000, 10400, 10650, 11000, 11400, 11700, 12100, 12500, 12800, 13200, 13600, 14000],
  aggressive: [10000, 10800, 11200, 11800, 12500, 12200, 13000, 13800, 14500, 15200, 15800, 16500],
}

export const BIP39_WORDS = ['ocean', 'brave', 'sunset', 'crystal', 'tiger', 'dawn']

export const ACCOUNT_TYPES = [
  { name: 'Cuenta Individual', icon: '👤', balance: '3.450,00 €' },
  { name: 'Cuenta Familiar', icon: '👨‍👩‍👧', balance: '8.230,50 €' },
  { name: 'Cuenta Inversión', icon: '📈', balance: '15.780,00 €' },
]

export const QUICK_QUESTIONS = [
  '¿Qué ETFs recomiendas?',
  '¿Cómo diversificar?',
  'Análisis de mi cartera',
  'Perfil de riesgo',
]

export const AI_CHAT = {
  userMessage: '¿Qué ETFs recomiendas para un perfil equilibrado?',
  aiResponse: 'Para un perfil equilibrado, te recomiendo considerar una combinación de:\n\n• MSCI World ETF (60%) — Diversificación global\n• Bonos Europeos Gov (30%) — Estabilidad\n• Bitcoin ETF (10%) — Crecimiento potencial\n\nEsta distribución ofrece un balance entre rendimiento y riesgo controlado.',
}
