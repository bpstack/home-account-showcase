// Configuración compartida para rutas de auth proxy

export const BACKEND_URL = process.env.API_URL || 'http://localhost:3001/api'

// Orígenes permitidos
const allowedOrigins = [
  'http://localhost:3000',
  'https://home-account.vercel.app',
  // Añadir tu dominio de producción aquí
]

// Patrones de Vercel preview
const vercelPreviewPattern = /^https:\/\/home-account-.*\.vercel\.app$/

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true // Requests del mismo origen
  if (allowedOrigins.includes(origin)) return true
  if (vercelPreviewPattern.test(origin)) return true
  return false
}

// Opciones de cookies para producción/desarrollo
const isProduction = process.env.NODE_ENV === 'production'

export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 5 * 60, // 5 minutos en segundos
}

export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 8 * 60 * 60, // 8 horas en segundos
}

// Cookie para cuenta seleccionada (no httpOnly para que JS pueda leerla)
export const selectedAccountCookieOptions = {
  httpOnly: false,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 días
}
