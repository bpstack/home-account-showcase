// Proposes an app subcategory for a bank category by keywords. Runs in the browser only.

import type { Category } from '@/lib/apiClient'

// Keyword mappings: bank keywords → app category/subcategory keywords
const KEYWORD_MAPPINGS: { keywords: string[]; category: string; subcategory?: string }[] = [
  {
    keywords: [
      'supermercado',
      'alimentacion',
      'alimentación',
      'mercadona',
      'carrefour',
      'lidl',
      'aldi',
      'dia',
      'experos',
      'hipercor',
      'eroski',
      'consum',
    ],
    category: 'supermercado',
    subcategory: 'alimentacion',
  },
  {
    keywords: [
      'ropa',
      'complementos',
      'vestir',
      'zara',
      'hm',
      'primark',
      'mango',
      'pull',
      'bershka',
      'stradivarius',
    ],
    category: 'supermercado',
    subcategory: 'ropa',
  },
  { keywords: ['limpieza', 'drogueria'], category: 'supermercado', subcategory: 'limpieza' },
  {
    keywords: [
      'restaurante',
      'cafeteria',
      'cafe',
      'comida fuera',
      'cena',
      'almuerzo',
      'barullo',
      'mcdonalds',
      'burger',
      'telepizza',
      'dominos',
    ],
    category: 'ocio',
    subcategory: 'restaurantes',
  },
  { keywords: ['bar', 'cerveza', 'copa', 'pub'], category: 'ocio', subcategory: 'bares' },
  {
    keywords: ['juguete', 'jugueteria', 'regalo', 'toys', 'regalos'],
    category: 'ocio',
    subcategory: 'regalos',
  },
  {
    keywords: ['vacacion', 'viaje', 'hotel', 'vuelo', 'airbnb', 'booking', 'ocio y viajes'],
    category: 'ocio',
    subcategory: 'vacaciones',
  },
  {
    keywords: [
      'cine',
      'teatro',
      'concierto',
      'espectaculo',
      'entrada',
      'netflix',
      'spotify',
      'hbo',
      'disney',
    ],
    category: 'ocio',
    subcategory: 'espectaculos',
  },
  {
    keywords: ['deporte', 'gimnasio', 'fitness', 'padel', 'tenis', 'futbol', 'decathlon'],
    category: 'ocio',
    subcategory: 'deporte',
  },
  {
    keywords: [
      'gasolina',
      'combustible',
      'gasolinera',
      'repsol',
      'cepsa',
      'bp',
      'shell',
      'galp',
      'vehiculo',
      'vehículo',
    ],
    category: 'transporte',
    subcategory: 'combustible',
  },
  {
    keywords: [
      'taxi',
      'uber',
      'cabify',
      'bus',
      'tren',
      'metro',
      'transporte publico',
      'renfe',
      'avanza',
    ],
    category: 'transporte',
    subcategory: 'taxi',
  },
  {
    keywords: ['parking', 'garage', 'aparcamiento'],
    category: 'transporte',
    subcategory: 'garage',
  },
  {
    keywords: ['taller', 'mecanico', 'itv', 'mantenimiento auto', 'neumatico', 'norauto', 'midas'],
    category: 'transporte',
    subcategory: 'mantenimiento',
  },
  {
    keywords: ['hogar', 'casa', 'vivienda', 'mueble', 'ikea', 'decoracion', 'leroy', 'bricomart'],
    category: 'vivienda',
    subcategory: 'muebles',
  },
  {
    keywords: ['electrodomestico', 'media markt', 'worten', 'el corte ingles electronica'],
    category: 'vivienda',
    subcategory: 'electrodomesticos',
  },
  {
    keywords: ['reparacion', 'fontanero', 'electricista', 'reforma'],
    category: 'vivienda',
    subcategory: 'reparaciones',
  },
  {
    keywords: ['luz', 'electricidad', 'endesa', 'iberdrola', 'naturgy'],
    category: 'gastos fijos',
    subcategory: 'luz',
  },
  { keywords: ['agua', 'canal', 'emasa', 'aguas'], category: 'gastos fijos', subcategory: 'agua' },
  {
    keywords: [
      'internet',
      'fibra',
      'movistar',
      'vodafone',
      'orange',
      'telefono',
      'digi',
      'masmovil',
      'jazztel',
    ],
    category: 'gastos fijos',
    subcategory: 'internet',
  },
  {
    keywords: ['hipoteca', 'prestamo vivienda'],
    category: 'gastos fijos',
    subcategory: 'hipoteca',
  },
  { keywords: ['comunidad', 'vecinos'], category: 'gastos fijos', subcategory: 'comunidad' },
  {
    keywords: [
      'farmacia',
      'medicina',
      'medicamento',
      'herbolario',
      'nutricion',
      'educacion y salud',
    ],
    category: 'salud',
    subcategory: 'farmacia',
  },
  {
    keywords: ['medico', 'hospital', 'clinica', 'dentista', 'oculista'],
    category: 'salud',
    subcategory: 'obra social',
  },
  {
    keywords: ['peluqueria', 'estetica', 'belleza', 'cuidado personal'],
    category: 'salud',
    subcategory: 'cuidado personal',
  },
  {
    keywords: ['cajero', 'efectivo', 'atm', 'retirada'],
    category: 'efectivo',
    subcategory: 'cajero',
  },
  { keywords: ['bizum'], category: 'efectivo', subcategory: 'bizum' },
  {
    keywords: ['transferencia', 'otros gastos', 'revolut', 'paypal', 'wise'],
    category: 'efectivo',
    subcategory: 'transferencias',
  },
  {
    keywords: ['nomina', 'salario', 'sueldo', 'pago empresa'],
    category: 'ingresos',
    subcategory: 'nomina',
  },
  {
    keywords: ['ingreso', 'abono', 'devolucion', 'ventajas', 'incentivo', 'bonificacion'],
    category: 'ingresos',
    subcategory: 'otros ingresos',
  },
  {
    keywords: ['seguro', 'mapfre', 'axa', 'allianz', 'generali', 'sanitas', 'adeslas'],
    category: 'seguros',
  },
  {
    keywords: ['colegio', 'escuela', 'instituto', 'universidad', 'educacion'],
    category: 'formacion',
    subcategory: 'colegio',
  },
  {
    keywords: ['libro', 'material escolar', 'papeleria'],
    category: 'formacion',
    subcategory: 'libros',
  },
  {
    keywords: ['curso', 'formacion', 'academia', 'udemy', 'coursera'],
    category: 'formacion',
    subcategory: 'cursos',
  },
  { keywords: ['compras'], category: 'supermercado' },
]

function normalizeText(text: string): string {
  return text.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** The subcategory whose category name matches a keyword of the bank's text, or null. */
export function suggestSubcategory(
  bank: { category: string | null; subcategory: string | null },
  categories: Category[]
): string | null {
  const bankText = normalizeText(`${bank.category ?? ''} ${bank.subcategory ?? ''}`)
  for (const mapping of KEYWORD_MAPPINGS) {
    if (!mapping.keywords.some((kw) => bankText.includes(normalizeText(kw)))) continue
    const appCat = categories.find((c) =>
      normalizeText(c.name).includes(normalizeText(mapping.category))
    )
    if (!appCat?.subcategories) continue
    if (mapping.subcategory) {
      const sub = appCat.subcategories.find((s) =>
        normalizeText(s.name).includes(normalizeText(mapping.subcategory!))
      )
      if (sub) return sub.id
    }
    if (appCat.subcategories.length > 0) return appCat.subcategories[0].id
  }
  return null
}
