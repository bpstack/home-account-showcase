/**
 * Logger estructurado para el backend
 *
 * Formato de salida:
 * {
 *   level: 'info' | 'warn' | 'error' | 'debug',
 *   timestamp: ISO8601,
 *   module: string,
 *   operation: string,
 *   message: string,
 *   context: { userId?, accountId?, requestId?, elapsed?, error?, stack? }
 * }
 *
 * En desarrollo: output coloreado con colores
 * En producción: JSON estructurado
 */

const isProduction = process.env.NODE_ENV === 'production'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  userId?: string
  accountId?: string
  requestId?: string
  elapsed?: number
  error?: string
  stack?: string
  [key: string]: unknown
}

interface LogEntry {
  level: LogLevel
  timestamp: string
  module: string
  operation: string
  message: string
  context: LogContext
}

function formatTimestamp(): string {
  return new Date().toISOString()
}

function formatContext(context: LogContext): string {
  if (Object.keys(context).length === 0) return ''

  const cleanContext = { ...context }
  delete cleanContext.error
  delete cleanContext.stack

  const parts: string[] = []

  if (cleanContext.userId) parts.push(`userId=${cleanContext.userId}`)
  if (cleanContext.accountId) parts.push(`accountId=${cleanContext.accountId}`)
  if (cleanContext.requestId) parts.push(`requestId=${cleanContext.requestId}`)
  if (cleanContext.elapsed !== undefined) parts.push(`elapsed=${cleanContext.elapsed}ms`)

  Object.entries(cleanContext).forEach(([key, value]) => {
    if (!['userId', 'accountId', 'requestId', 'elapsed'].includes(key) && value !== undefined) {
      parts.push(`${key}=${String(value)}`)
    }
  })

  return parts.length > 0 ? ' ' + parts.join(' ') : ''
}

function formatError(error: string, stack?: string): string {
  let result = error
  if (stack && !isProduction) {
    result += `\n${stack.split('\n').slice(0, 5).join('\n')}`
  }
  return result
}

function colorize(level: LogLevel, message: string): string {
  const colors: Record<LogLevel, string> = {
    info: '\x1b[32m', // verde
    warn: '\x1b[33m', // amarillo
    error: '\x1b[31m', // rojo
    debug: '\x1b[36m', // cyan
  }
  const reset = '\x1b[0m'

  return `${colors[level]}[${level.toUpperCase()}]${reset} ${message}`
}

function output(entry: LogEntry): void {
  const { level, module, operation, message, context } = entry

  // Formatear contexto
  let contextStr = formatContext(context)

  // Añadir error si existe
  if (context.error) {
    const errorStr = formatError(context.error, context.stack)
    contextStr += ` error=${errorStr}`
  }

  const fullMessage = `[${module}] ${operation}: ${message}${contextStr}`

  if (isProduction) {
    // Producción: JSON estructurado
    console.log(JSON.stringify(entry))
  } else {
    // Desarrollo: coloreado + legible
    console.log(colorize(level, fullMessage))
  }
}

// Generador de requestId para trazar requests
let requestCounter = 0
function generateRequestId(): string {
  return `req-${Date.now()}-${++requestCounter}`
}

export const logger = {
  info: (module: string, operation: string, message: string, context: LogContext = {}): void => {
    output({
      level: 'info',
      timestamp: formatTimestamp(),
      module,
      operation,
      message,
      context,
    })
  },

  warn: (module: string, operation: string, message: string, context: LogContext = {}): void => {
    output({
      level: 'warn',
      timestamp: formatTimestamp(),
      module,
      operation,
      message,
      context,
    })
  },

  error: (
    module: string,
    operation: string,
    message: string,
    error: Error | string,
    context: LogContext = {}
  ): void => {
    const errorObj = error instanceof Error ? error : new Error(error)
    output({
      level: 'error',
      timestamp: formatTimestamp(),
      module,
      operation,
      message,
      context: {
        ...context,
        error: errorObj.message,
        stack: errorObj.stack,
      },
    })
  },

  debug: (module: string, operation: string, message: string, context: LogContext = {}): void => {
    // Solo mostrar debug en desarrollo
    if (!isProduction) {
      output({
        level: 'debug',
        timestamp: formatTimestamp(),
        module,
        operation,
        message,
        context,
      })
    }
  },

  // Helper para crear request context
  createContext: (userId?: string, accountId?: string): LogContext => {
    return {
      requestId: generateRequestId(),
      userId,
      accountId,
    }
  },

  // Helper para medir tiempo
  startTimer: (): (() => number) => {
    const start = Date.now()
    return () => Date.now() - start
  },
}

export type { LogContext, LogEntry }
