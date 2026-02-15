// services/ai/security/output-validator.ts
// Validate AI outputs before returning to user

export interface OutputValidation {
  safe: boolean
  sanitizedOutput: string
  issues: string[]
  blocked: boolean
}

// ============================================
// SENSITIVE DATA PATTERNS
// ============================================

// Patterns that should never appear in output
const BLOCKED_OUTPUT_PATTERNS = [
  // System/internal information
  /system\s*prompt\s*[:=]/i,
  /initial\s*instructions?\s*[:=]/i,
  /my\s*programming\s*[:=]/i,
  /here\s*(is|are)\s*(my|the)\s*(system|initial|full)\s*(prompt|instructions?)/i,

  // API keys and secrets
  /api[_-]?key\s*[:=]\s*["']?[a-zA-Z0-9_-]{20,}/i,
  /secret[_-]?key\s*[:=]\s*["']?[a-zA-Z0-9_-]{20,}/i,
  /password\s*[:=]\s*["']?[^\s"']{8,}/i,
  /bearer\s+[a-zA-Z0-9_-]{20,}/i,

  // Database/internal structure
  /SELECT\s+.*\s+FROM\s+\w+/i,
  /INSERT\s+INTO\s+\w+/i,
  /UPDATE\s+\w+\s+SET/i,
  /DELETE\s+FROM\s+\w+/i,

  // File paths
  /[A-Za-z]:\\[^\s]+\.(ts|js|json|env)/i,
  /\/home\/[^\s]+\.(ts|js|json|env)/i,
  /\/var\/[^\s]+\.(ts|js|json|env)/i,

  // Stack traces
  /at\s+\w+\s+\([^)]+:\d+:\d+\)/,
  /Error:\s+.*\n\s+at\s+/,
]

// Patterns that indicate potential data leakage
const SUSPICIOUS_OUTPUT_PATTERNS = [
  // Raw JSON dumps of sensitive data
  /"(password|secret|apiKey|token|credential)"\s*:/i,

  // Internal variable names
  /process\.env\./i,
  /\$\{.*\}/,

  // Unusual system references
  /backend\/|frontend\/|node_modules\//i,
]

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate AI output for security issues
 */
export function validateAIOutput(
  output: string,
  additionalSensitivePatterns?: string[]
): OutputValidation {
  const issues: string[] = []
  let blocked = false
  let sanitizedOutput = output

  // Check blocked patterns
  for (const pattern of BLOCKED_OUTPUT_PATTERNS) {
    if (pattern.test(output)) {
      issues.push(`Blocked pattern detected: ${pattern.source.substring(0, 30)}`)
      blocked = true
    }
  }

  // Check suspicious patterns
  for (const pattern of SUSPICIOUS_OUTPUT_PATTERNS) {
    if (pattern.test(output)) {
      issues.push(`Suspicious pattern: ${pattern.source.substring(0, 30)}`)
    }
  }

  // Check additional patterns if provided
  if (additionalSensitivePatterns) {
    for (const patternStr of additionalSensitivePatterns) {
      try {
        const pattern = new RegExp(patternStr, 'i')
        if (pattern.test(output)) {
          issues.push(`Custom sensitive pattern detected`)
          // Redact instead of blocking
          sanitizedOutput = sanitizedOutput.replace(pattern, '[REDACTED]')
        }
      } catch {
        // Invalid regex, skip
      }
    }
  }

  // Sanitize output if issues found but not blocked
  if (issues.length > 0 && !blocked) {
    sanitizedOutput = sanitizeOutput(output)
  }

  // If blocked, return safe error message
  if (blocked) {
    sanitizedOutput =
      'Lo siento, no puedo procesar esta respuesta. Por favor, reformula tu pregunta.'
  }

  return {
    safe: issues.length === 0,
    sanitizedOutput,
    issues,
    blocked,
  }
}

/**
 * Sanitize output by redacting sensitive information
 */
function sanitizeOutput(output: string): string {
  let sanitized = output

  // Redact potential API keys
  sanitized = sanitized.replace(
    /([a-zA-Z_]+[_-]?key\s*[:=]\s*["']?)[a-zA-Z0-9_-]{20,}/gi,
    '$1[REDACTED]'
  )

  // Redact potential passwords
  sanitized = sanitized.replace(/(password\s*[:=]\s*["']?)[^\s"']+/gi, '$1[REDACTED]')

  // Redact file paths
  sanitized = sanitized.replace(/[A-Za-z]:\\[^\s]+\.(ts|js|json|env)/gi, '[FILE_PATH_REDACTED]')

  // Redact email addresses (keep domain for context)
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[EMAIL]@$1')

  // Redact potential credit card numbers
  sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_REDACTED]')

  // Redact potential phone numbers
  sanitized = sanitized.replace(
    /\b\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g,
    '[PHONE_REDACTED]'
  )

  return sanitized
}

/**
 * Check if output contains financial data that wasn't explicitly requested
 */
export function checkUnauthorizedFinancialData(
  output: string,
  authorizedData: {
    canShowIncome?: boolean
    canShowExpenses?: boolean
    canShowBalance?: boolean
    canShowTransactions?: boolean
  }
): { safe: boolean; issues: string[] } {
  const issues: string[] = []

  // Patterns for financial data
  const incomePattern = /ingreso\s*(mensual|anual)?\s*[:=]?\s*[\d.,]+\s*€/i
  const expensePattern = /gasto\s*(mensual|anual)?\s*[:=]?\s*[\d.,]+\s*€/i
  const balancePattern = /saldo\s*(actual|total)?\s*[:=]?\s*[\d.,]+\s*€/i
  const transactionPattern = /transacci[oó]n\s*[:=]?\s*["'][^"']+["']/i

  if (!authorizedData.canShowIncome && incomePattern.test(output)) {
    issues.push('Unauthorized income data in response')
  }

  if (!authorizedData.canShowExpenses && expensePattern.test(output)) {
    issues.push('Unauthorized expense data in response')
  }

  if (!authorizedData.canShowBalance && balancePattern.test(output)) {
    issues.push('Unauthorized balance data in response')
  }

  if (!authorizedData.canShowTransactions && transactionPattern.test(output)) {
    issues.push('Unauthorized transaction data in response')
  }

  return {
    safe: issues.length === 0,
    issues,
  }
}

/**
 * Validate JSON output structure
 */
export function validateJSONOutput(
  output: string,
  requiredFields: string[]
): {
  valid: boolean
  issues: string[]
  parsed?: any
} {
  try {
    // Try to extract JSON from markdown code blocks
    let jsonStr = output
    const jsonMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    const parsed = JSON.parse(jsonStr.trim())

    // Check required fields
    const missingFields = requiredFields.filter((field) => !(field in parsed))
    if (missingFields.length > 0) {
      return {
        valid: false,
        issues: [`Missing required fields: ${missingFields.join(', ')}`],
        parsed,
      }
    }

    return { valid: true, issues: [], parsed }
  } catch (error) {
    return {
      valid: false,
      issues: ['Invalid JSON structure'],
    }
  }
}
