// middlewares/rateLimiter.ts

import rateLimit from 'express-rate-limit'

/**
 * Rate limiter para login
 * Bloquea tras 7 intentos fallidos
 * Ventana: 15 minutos (se resetea tras ese tiempo)
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 7, // Máximo 7 intentos fallidos
  message: {
    success: false,
    error: 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.',
  },
  standardHeaders: true, // Retorna rate limit info en headers `RateLimit-*`
  legacyHeaders: false, // No retorna `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Solo cuenta requests fallidos (status >= 400)
})

/**
 * Rate limiter para registro de usuarios
 * Previene enumeración de cuentas y creación masiva
 * Ventana: 1 hora (se resetea tras ese tiempo)
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // Máximo 5 registros por IP por hora
  message: {
    success: false,
    error: 'Demasiados registros desde esta dirección IP. Intenta de nuevo en 1 hora.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false, // Contar todos los registros, exitosos o fallidos
})

/**
 * Rate limiter para datos de mercado
 * Protege APIs externas (CoinGecko, AlphaVantage, Frankfurter)
 * Ventana: 1 minuto, máximo 10 requests por usuario
 */
export const marketRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // Máximo 10 requests por minuto
  message: {
    success: false,
    error: 'Demasiadas solicitudes de datos de mercado. Intenta de nuevo en 1 minuto.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter para importación de archivos
 * Previene uploads masivos de archivos
 * Ventana: 1 minuto, máximo 5 archivos por usuario
 */
export const importFileRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // Máximo 5 uploads por minuto
  message: {
    success: false,
    error: 'Demasiados archivos subidos. Intenta de nuevo en 1 minuto.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter para actualización de claves criptográficas
 * Previene ataques de fuerza bruta en claves
 * Ventana: 1 minuto, máximo 5 cambios por usuario
 */
export const cryptoKeyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // Máximo 5 cambios de clave por minuto
  message: {
    success: false,
    error: 'Demasiados cambios de clave. Intenta de nuevo en 1 minuto.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter para envío de invitaciones
 * Previene spam de invitaciones
 * Ventana: 1 hora, máximo 20 invitaciones por usuario
 */
export const invitationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // Máximo 20 invitaciones por hora
  message: {
    success: false,
    error: 'Demasiadas invitaciones enviadas. Intenta de nuevo en 1 hora.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter para password reset
 * Previene abuso del endpoint de recuperación
 * Ventana: 15 minutos, máximo 3 intentos por IP
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // Máximo 3 solicitudes por IP
  message: {
    success: false,
    error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})
