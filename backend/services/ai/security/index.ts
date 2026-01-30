// services/ai/security/index.ts
// Export all security utilities

export {
  checkInputSecurity,
  checkOutputSecurity,
  getUserSecurityStatus,
  clearUserSuspiciousAttempts,
  cleanupExpiredSecurityData,
  type SecurityCheckResult,
  type OutputSecurityResult,
} from './ai-security.js'

export {
  detectPromptInjection,
  sanitizeUserInput,
  escapeForPrompt,
  isInputSafe,
  type ThreatAnalysis,
} from './prompt-guard.js'

export {
  validateAIOutput,
  checkUnauthorizedFinancialData,
  validateJSONOutput,
  type OutputValidation,
} from './output-validator.js'

export {
  logSecurityEvent,
  getUserSecurityEvents,
  getSecurityStats,
  cleanOldSecurityLogs,
  type SecurityEventType,
  type SecurityEvent,
} from './audit-logger.js'

export { SECURITY_INSTRUCTIONS, buildSecureSystemPrompt } from './secure-prompts.js'
