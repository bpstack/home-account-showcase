/**
 * Secure sanitization utilities using DOMPurify.
 * More robust than regex-based sanitization.
 */

import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import { logger } from './logger.js'

// Configure DOMPurify for server-side use
const window = new JSDOM('').window
const purify = DOMPurify(window)

// Configure DOMPurify for maximum security
purify.setConfig({
  USE_PROFILES: { html: true },
  ALLOWED_TAGS: [
    // Only allow basic text formatting tags
    'b',
    'strong',
    'i',
    'em',
    'u',
    's',
    'br',
    'p',
    'span',
    'div',
  ],
  ALLOWED_ATTR: [
    // Only allow basic styling attributes
    'style',
    'class',
  ],
  FORBID_TAGS: [
    'script',
    'iframe',
    'object',
    'embed',
    'form',
    'input',
    'button',
    'link',
    'meta',
    'base',
    'applet',
    'frame',
    'frameset',
    'noframes',
  ],
  FORBID_ATTR: [
    'onerror',
    'onload',
    'onclick',
    'onmouseover',
    'onsubmit',
    'onfocus',
    'onblur',
    'onchange',
    'onselect',
    'onkeydown',
    'onkeypress',
    'onkeyup',
    'href',
    'src',
    'action',
    'formaction',
  ],
  SANITIZE_DOM: true,
  FORCE_BODY: true,
})

/**
 * Secure XSS sanitization using DOMPurify
 * @param input - The string to sanitize
 * @returns Sanitized string safe for HTML rendering
 */
export function secureXSS(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return ''

  try {
    return purify.sanitize(input.trim())
  } catch (error) {
    logger.warn('SECURE_SANITIZE', 'secureXSS', 'DOMPurify sanitization failed, using fallback')
    return basicEscape(input)
  }
}

/**
 * Basic HTML escaping fallback
 */
function basicEscape(input: string): string {
  return input
    .replace(/\u0026/g, '&amp;')
    .replace(/\u003c/g, '&lt;')
    .replace(/\u003e/g, '&gt;')
    .replace(/\u0022/g, '&quot;')
    .replace(/\u0027/g, '&#x27;')
    .replace(/\u0060/g, '&#x60;')
    .replace(/\u003d/g, '&#x3D;')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/\bon\w+\s*=/gi, '')
    .replace(/<[^>]*>?/gm, '')
    .trim()
}

/**
 * Sanitize for database storage - less aggressive but removes dangerous content
 */
export function sanitizeForStorage(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return ''

  try {
    const tempPurify = DOMPurify(window)
    tempPurify.setConfig({
      USE_PROFILES: { html: false },
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      FORCE_BODY: true,
    })

    return tempPurify.sanitize(input.trim())
  } catch (error) {
    logger.warn('SECURE_SANITIZE', 'sanitizeForStorage', 'DOMPurify storage sanitization failed')
    return input
      .replace(/<[^>]*>?/gm, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/\bon\w+\s*=/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

/**
 * Validate and sanitize URL to prevent XSS
 */
export function sanitizeURL(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return ''

  const sanitized = input.trim()

  // Block dangerous URL schemes
  const dangerousSchemes = ['javascript:', 'vbscript:', 'data:', 'file:', 'ftp:', 'telnet:']

  for (const scheme of dangerousSchemes) {
    if (sanitized.toLowerCase().startsWith(scheme)) {
      return ''
    }
  }

  return sanitized
}

/**
 * Additional validation for unicode bypass attempts
 */
export function detectUnicodeBypass(input: string): boolean {
  if (!input) return false

  // Check for unicode escapes that could bypass regex filters
  const unicodeScriptPatterns = [
    /\\u003cscript\\u003e/i, // <script>
    /\\u003c\\u002fscript\\u003e/i, // </script>
    /\\u006a\\u0061\\u0076\\u0061\\u0073\\u0063\\u0072\\u0069\\u0070\\u0074/i, // javascript
  ]

  return unicodeScriptPatterns.some((pattern) => pattern.test(input))
}

export default {
  secureXSS,
  sanitizeForStorage,
  sanitizeURL,
  detectUnicodeBypass,
}
