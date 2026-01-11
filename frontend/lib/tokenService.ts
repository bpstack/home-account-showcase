// lib/tokenService.ts
// Servicio para manejar tokens en memoria (access) y localStorage (refresh)

const REFRESH_TOKEN_KEY = 'refreshToken'

/**
 * Guarda el refresh token en localStorage
 */
export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

/**
 * Obtiene el refresh token de localStorage
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Elimina el refresh token de localStorage
 */
export function removeRefreshToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * Access token se almacena en memoria (variable de módulo)
 * No persiste al cerrar la pestaña/navegador
 */
let accessToken: string | null = null

/**
 * Guarda el access token en memoria
 */
export function setAccessToken(token: string): void {
  accessToken = token
}

/**
 * Obtiene el access token de memoria
 */
export function getAccessToken(): string | null {
  return accessToken
}

/**
 * Elimina el access token de memoria
 */
export function clearAccessToken(): void {
  accessToken = null
}

/**
 * Limpia todos los tokens (access y refresh)
 */
export function clearAllTokens(): void {
  clearAccessToken()
  removeRefreshToken()
}
