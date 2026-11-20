// Configuración compartida para rutas de auth proxy

export const BACKEND_URL = process.env.API_URL || 'http://localhost:3001/api'

export { isAllowedOrigin } from '@/lib/auth-origins'

// Opciones de cookies para producción/desarrollo
const isProduction = process.env.NODE_ENV === 'production'

export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 15 * 60, // 15 minutos en segundos
}

export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 8 * 60 * 60, // 8 horas en segundos
}

export const csrfTokenCookieOptions = {
  httpOnly: false,
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
