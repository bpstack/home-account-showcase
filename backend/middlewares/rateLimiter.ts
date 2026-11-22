// middlewares/rateLimiter.ts

import type { Request, Response } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

// Every browser request reaches the backend through the Next proxy, so `req.ip` is the same for
// everyone: a limiter keyed by IP is one counter shared by all users, and a handful of failures
// blocks the route for the whole user base. Limiters key by the account instead. The IP fallbacks
// only cover a request without the field, which the route rejects anyway.

/**
 * Key of the limiters on routes run after `authenticateToken`: the signed-in user.
 */
export function userRateLimitKey(req: Request): string {
  return req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip ?? '')
}

/**
 * Key of the public auth limiters (login, register, password reset, verification): the email the
 * request is about, from the body or, on GET, the query. Normalized, so changing its case or
 * padding it does not get a fresh counter.
 */
export function emailRateLimitKey(req: Request): string {
  const raw = req.body?.email ?? req.query?.email
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return email ? `email:${email}` : ipKeyGenerator(req.ip ?? '')
}

/**
 * Rate limiter para login, por email
 * Bloquea tras 7 intentos fallidos
 * Ventana: 15 minutos (se resetea tras ese tiempo)
 */
export const loginRateLimiter = rateLimit({
  keyGenerator: emailRateLimitKey,
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
 * Rate limiter complementario para comprobar o cambiar el PIN, por usuario.
 * El límite principal es el contador persistente por usuario.
 */
export const pinRateLimiter = rateLimit({
  keyGenerator: userRateLimitKey,
  windowMs: 15 * 60 * 1000,
  max: 7,
  message: {
    success: false,
    error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
})

/**
 * Key of the refresh limiter: the session, read from the refresh token that readRefreshSession
 * already verified. Not the IP: behind the Next proxy every user has the same one.
 */
export function refreshRateLimitKey(_req: Request, res: Response): string {
  return `session:${res.locals.refreshSid}`
}

/** Refreshes per session: a normal session rotates every 15 min plus a burst in the grace window. */
export const refreshRateLimiter = rateLimit({
  keyGenerator: refreshRateLimitKey,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Demasiadas renovaciones de sesión. Inténtalo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter para registro de usuarios, por email
 * La creación masiva la frena el límite global de emails, que cada registro consume
 * Ventana: 1 hora (se resetea tras ese tiempo)
 */
export const registerRateLimiter = rateLimit({
  keyGenerator: emailRateLimitKey,
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 registros por email por hora
  message: {
    success: false,
    error: 'Demasiados intentos de registro con este email. Intenta de nuevo en 1 hora.',
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
  keyGenerator: userRateLimitKey,
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
 * Rate limiter para actualización de claves criptográficas
 * Previene ataques de fuerza bruta en claves
 * Ventana: 1 minuto, máximo 5 cambios por usuario
 */
export const cryptoKeyRateLimiter = rateLimit({
  keyGenerator: userRateLimitKey,
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
 * Ventana: 24 horas, máximo 3 invitaciones por usuario
 */
export const invitationRateLimiter = rateLimit({
  keyGenerator: userRateLimitKey,
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 3, // Máximo 3 invitaciones por 24 horas
  message: {
    success: false,
    error: 'Demasiadas invitaciones enviadas. Intenta de nuevo en 24 horas.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter para password reset
 * Previene abuso del endpoint de recuperación
 * Ventana: 15 minutos, máximo 3 intentos por email
 */
export const passwordResetRateLimiter = rateLimit({
  keyGenerator: emailRateLimitKey,
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // Máximo 3 solicitudes por email
  message: {
    success: false,
    error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter para reenvío de verificación de email
 * Previene spam de emails de verificación
 * Ventana: 24 horas, máximo 3 solicitudes por email
 */
export const verificationRateLimiter = rateLimit({
  keyGenerator: emailRateLimitKey,
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 3, // Máximo 3 solicitudes por email
  message: {
    success: false,
    error:
      'Se han realizado demasiados intentos. Consulta con un administrador para más información.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter para cambio de email
 * Más restrictivo porque permite cambiar el email
 * Ventana: 48 horas, máximo 3 solicitudes por usuario (va después de authenticateToken)
 */
export const changeEmailRateLimiter = rateLimit({
  keyGenerator: userRateLimitKey,
  windowMs: 48 * 60 * 60 * 1000, // 48 horas
  max: 3, // Máximo 3 cambios por usuario
  message: {
    success: false,
    error:
      'Se han realizado demasiados intentos. Consulta con un administrador para más información.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter global para emails
 * Protege la cuota de EmailJS (200 emails/mes): un solo contador para todos, a propósito, porque
 * la cuota también es una sola. Cada ruta lleva además su propio límite por email o por usuario.
 * Ventana: 24 horas, máximo 8 emails en total
 */
export const emailRateLimiter = rateLimit({
  keyGenerator: () => 'global',
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 8, // Máximo 8 emails al día entre todos
  message: {
    success: false,
    error: 'Límite de solicitudes de email alcanzado. Intenta mañana.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})
