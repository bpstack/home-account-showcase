/**
 * Sanitization utilities to prevent XSS and injection attacks.
 */

/**
 * Sanitize text to prevent XSS attacks.
 * Removes HTML tags and escapes dangerous characters.
 *
 * @param input - The string to sanitize
 * @returns Sanitized string safe for display
 */
export function sanitizeXSS(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return ''

  let sanitized = input

  // 1. Remove HTML tags (including malformed ones)
  // This handles: <script>, <img onerror=...>, <svg onload=...>, etc.
  sanitized = sanitized.replace(/<[^>]*>?/gm, '')

  // 2. Remove javascript: and data: URLs that could execute code
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/data:/gi, '')
  sanitized = sanitized.replace(/vbscript:/gi, '')

  // 3. Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\bon\w+\s*=/gi, '')

  // 4. Escape HTML entities for any remaining special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  return sanitized.trim()
}

/**
 * Sanitize text for database storage.
 * Less aggressive than XSS sanitization - preserves readability
 * but removes dangerous content.
 *
 * @param input - The string to sanitize
 * @returns Sanitized string safe for storage
 */
export function sanitizeForStorage(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return ''

  let sanitized = input

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>?/gm, '')

  // Remove script-like content
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/data:text\/html/gi, '')
  sanitized = sanitized.replace(/vbscript:/gi, '')

  // Remove event handlers
  sanitized = sanitized.replace(/\bon\w+\s*=/gi, '')

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ')

  return sanitized.trim()
}

/**
 * Sanitize CSV values to prevent CSV Injection (Formula Injection) attacks.
 * Malicious CSV files can contain formulas like =CMD|'/C calc'!A0 that execute
 * when opened in Excel/Google Sheets.
 *
 * Dangerous prefixes: = + - @ | \t \r \n
 */
export function sanitizeCSVValue(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return ''

  // First apply XSS sanitization
  let sanitized = sanitizeForStorage(value)

  // Check for dangerous formula prefixes
  const dangerousPrefixes = ['=', '+', '-', '@', '|', '\t', '\r', '\n']
  const firstChar = sanitized.charAt(0)

  if (dangerousPrefixes.includes(firstChar)) {
    // Exception: negative numbers are OK (e.g., "-45.30")
    if (firstChar === '-' && /^-[\d.,]+$/.test(sanitized)) {
      return sanitized
    }
    // Exception: positive numbers with + are OK (e.g., "+150.00")
    if (firstChar === '+' && /^\+[\d.,]+$/.test(sanitized)) {
      return sanitized
    }

    // For actual dangerous values, remove the prefix
    console.warn(
      `CSV/Formula Injection attempt detected and sanitized: "${sanitized.substring(0, 50)}..."`
    )
    return sanitized.substring(1).trim()
  }

  return sanitized
}

/**
 * Validate and sanitize an email address.
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return ''

  // Basic email sanitization - remove dangerous characters
  const sanitized = email
    .toLowerCase()
    .trim()
    .replace(/[<>'"]/g, '')

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(sanitized)) {
    return ''
  }

  return sanitized
}

/**
 * Sanitize a filename to prevent path traversal and injection.
 */
export function sanitizeFilename(filename: string | null | undefined): string {
  if (!filename || typeof filename !== 'string') return 'unnamed'

  return filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
    .replace(/\.\./g, '') // Remove path traversal attempts
    .replace(/^\.+/, '') // Remove leading dots
    .trim() || 'unnamed'
}
