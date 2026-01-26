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
