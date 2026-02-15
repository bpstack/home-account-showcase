// services/ai/security/prompt-guard.ts
// Prompt Injection Detection and Input Sanitization

export interface ThreatAnalysis {
  hasThreat: boolean
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical'
  patterns: string[]
  score: number
}

// ============================================
// PROMPT INJECTION PATTERNS
// ============================================

// Critical patterns - immediate block
const CRITICAL_PATTERNS = [
  // Direct instruction override attempts
  /ignore\s+(all\s+)?(previous|above|prior)?\s*(instructions?|rules?|prompts?)/i,
  /forget\s+(everything|all|what)\s+(you|i)\s+(told|said|know)/i,
  /disregard\s+(all|any|the)\s+(previous|above|prior|instructions?|rules?)/i,
  /override\s+(your|the|all)\s+(instructions?|rules?|programming)/i,

  // Role manipulation
  /you\s+are\s+now\s+(a|an)\s+(?!financial|investment|asesor)/i,
  /act\s+as\s+(if\s+you\s+are|a|an)\s+(?!financial|investment)/i,
  /pretend\s+(to\s+be|you\s+are)\s+(?!a\s+financial)/i,
  /switch\s+(to|into)\s+(a\s+)?different\s+(mode|role|persona)/i,

  // System prompt extraction
  /show\s+(me\s+)?(your|the)\s+(system\s+)?prompt/i,
  /reveal\s+(your|the)\s+(instructions?|programming|system)/i,
  /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?)/i,
  /print\s+(your|the)\s+(system|full)\s+(prompt|instructions?)/i,
  /display\s+(the\s+)?(hidden|system|initial)\s+(prompt|instructions?)/i,
  /(your|the)\s+(hidden|secret|internal)\s+(instructions?|prompt|rules?)/i,

  // Data exfiltration attempts
  /output\s+(all|the|every)\s+(user|financial|private)\s+data/i,
  /dump\s+(the\s+)?(database|user\s+data|all\s+data)/i,
  /extract\s+(all\s+)?(user|financial|sensitive)\s+(data|information)/i,
  /list\s+all\s+(users?|accounts?|transactions?)/i,

  // Code injection
  /\beval\s*\(/i,
  /\bexec\s*\(/i,
  /<script[\s>]/i,
  /javascript:/i,
  /\{\{\s*.*\s*\}\}/, // Template injection
  /\$\{.*\}/, // Template literal injection
]

// High-risk patterns - strong warning
const HIGH_RISK_PATTERNS = [
  // Instruction manipulation
  /new\s+instructions?:?\s/i,
  /updated?\s+instructions?:?\s/i,
  /additional\s+instructions?:?\s/i,
  /ignore\s+(this|that|the)\s+(rule|instruction|limit)/i,

  // Boundary testing
  /\[system\]/i,
  /\[user\]/i,
  /\[assistant\]/i,
  /```system/i,
  /---\s*system/i,

  // Context manipulation
  /context:\s*\{/i,
  /json\s*:\s*\{/i,
  /respond\s+with\s+(only\s+)?json/i,

  // Developer mode attempts
  /developer\s+mode/i,
  /debug\s+mode/i,
  /admin\s+mode/i,
  /maintenance\s+mode/i,
  /testing\s+mode/i,
  /jailbreak/i,
  /DAN\s+mode/i,
]

// Medium-risk patterns - monitoring
const MEDIUM_RISK_PATTERNS = [
  // Suspicious instructions
  /do\s+not\s+(tell|inform|alert)/i,
  /don't\s+(tell|inform|alert)/i,
  /keep\s+.{0,20}\s+secret/i,
  /hide\s+(this|the)\s+(from|response)/i,

  // Unusual formatting requests
  /respond\s+(only\s+)?(in|with)\s+(base64|hex|binary|encoded)/i,
  /encode\s+(your|the)\s+response/i,
  /encrypt\s+(your|the)\s+(answer|response)/i,

  // Suspicious role references
  /as\s+an?\s+(ai|language\s+model|llm|gpt|claude)/i,
  /your\s+(true|real|actual)\s+(purpose|function|role)/i,

  // Boundary probing
  /what\s+can('t)?\s+you\s+(do|say|reveal)/i,
  /what\s+are\s+your\s+limitations?/i,
  /bypass\s+(the\s+)?(filter|restriction|limit)/i,
]

// Low-risk patterns - just log
const LOW_RISK_PATTERNS = [
  // Potential social engineering
  /trust\s+me/i,
  /i('m|\s+am)\s+(an?\s+)?(admin|developer|owner)/i,
  /this\s+is\s+(a\s+)?test/i,
  /for\s+(research|educational|testing)\s+purposes?/i,

  // Unusual requests
  /repeat\s+after\s+me/i,
  /say\s+exactly/i,
  /word\s+for\s+word/i,
]

// ============================================
// DETECTION FUNCTIONS
// ============================================

/**
 * Detect prompt injection attempts
 */
export function detectPromptInjection(input: string): ThreatAnalysis {
  const patterns: string[] = []
  let score = 0

  // Normalize input for analysis
  const normalized = input.toLowerCase().replace(/\s+/g, ' ').trim()

  // Check critical patterns (score: 100 each)
  for (const pattern of CRITICAL_PATTERNS) {
    if (pattern.test(input)) {
      patterns.push(`critical:${pattern.source.substring(0, 30)}`)
      score += 100
    }
  }

  // Check high-risk patterns (score: 50 each)
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(input)) {
      patterns.push(`high:${pattern.source.substring(0, 30)}`)
      score += 50
    }
  }

  // Check medium-risk patterns (score: 20 each)
  for (const pattern of MEDIUM_RISK_PATTERNS) {
    if (pattern.test(input)) {
      patterns.push(`medium:${pattern.source.substring(0, 30)}`)
      score += 20
    }
  }

  // Check low-risk patterns (score: 5 each)
  for (const pattern of LOW_RISK_PATTERNS) {
    if (pattern.test(input)) {
      patterns.push(`low:${pattern.source.substring(0, 30)}`)
      score += 5
    }
  }

  // Additional heuristics
  score += checkHeuristics(input, patterns)

  // Determine threat level
  let threatLevel: ThreatAnalysis['threatLevel'] = 'none'
  if (score >= 100) threatLevel = 'critical'
  else if (score >= 50) threatLevel = 'high'
  else if (score >= 20) threatLevel = 'medium'
  else if (score > 0) threatLevel = 'low'

  return {
    hasThreat: score > 0,
    threatLevel,
    patterns,
    score,
  }
}

/**
 * Additional heuristic checks
 */
function checkHeuristics(input: string, patterns: string[]): number {
  let score = 0

  // Excessive special characters
  const specialCharRatio = (input.match(/[{}\[\]<>|\\`]/g) || []).length / input.length
  if (specialCharRatio > 0.1) {
    patterns.push('heuristic:excessive_special_chars')
    score += 15
  }

  // Very long input (potential prompt stuffing)
  if (input.length > 2000) {
    patterns.push('heuristic:long_input')
    score += 10
  }

  // Multiple newlines (potential instruction injection)
  const newlineCount = (input.match(/\n/g) || []).length
  if (newlineCount > 10) {
    patterns.push('heuristic:many_newlines')
    score += 10
  }

  // Markdown/code block abuse
  const codeBlocks = (input.match(/```/g) || []).length
  if (codeBlocks > 2) {
    patterns.push('heuristic:code_block_abuse')
    score += 20
  }

  // Unicode homoglyph detection (using similar-looking characters)
  if (/[а-яА-Я]/.test(input) && /[a-zA-Z]/.test(input)) {
    // Mix of Cyrillic and Latin (potential homoglyph attack)
    patterns.push('heuristic:mixed_scripts')
    score += 30
  }

  // Repeated instruction-like phrases
  const instructionPhrases = input.match(/\b(must|should|always|never|do not|don't)\b/gi) || []
  if (instructionPhrases.length > 5) {
    patterns.push('heuristic:instruction_stuffing')
    score += 15
  }

  return score
}

// ============================================
// SANITIZATION FUNCTIONS
// ============================================

/**
 * Sanitize user input to neutralize injection attempts
 */
export function sanitizeUserInput(input: string): string {
  let sanitized = input

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Normalize unicode
  sanitized = sanitized.normalize('NFKC')

  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Escape potential template literals
  sanitized = sanitized.replace(/\$\{/g, '$\\{')

  // Remove markdown that could be used for injection
  sanitized = sanitized.replace(/```(system|assistant|user)/gi, '```code')

  // Limit consecutive newlines
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n')

  // Trim and limit length
  sanitized = sanitized.trim().substring(0, 4000)

  return sanitized
}

/**
 * Escape user input for safe inclusion in prompts
 */
export function escapeForPrompt(input: string): string {
  // Add clear delimiters around user input
  return `<user_message>\n${sanitizeUserInput(input)}\n</user_message>`
}

/**
 * Check if input is safe for AI processing
 */
export function isInputSafe(input: string): { safe: boolean; reason?: string } {
  const analysis = detectPromptInjection(input)

  if (analysis.threatLevel === 'critical') {
    return { safe: false, reason: 'Critical security threat detected' }
  }

  if (analysis.threatLevel === 'high') {
    return { safe: false, reason: 'High-risk pattern detected' }
  }

  return { safe: true }
}
