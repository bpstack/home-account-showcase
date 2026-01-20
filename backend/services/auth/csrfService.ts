import crypto from 'crypto'

const CSRF_TOKEN_LENGTH = 32

export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

export function validateCSRFToken(tokenFromHeader: string | undefined, tokenFromCookie: string | undefined): boolean {
  if (!tokenFromHeader || !tokenFromCookie) {
    return false
  }

  if (tokenFromHeader.length !== tokenFromCookie.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(tokenFromHeader),
    Buffer.from(tokenFromCookie)
  )
}

export function createCSRFCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: 8 * 60 * 60 * 1000, // 8 horas
    path: '/',
  }
}
