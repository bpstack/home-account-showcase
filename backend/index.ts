import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import passport from 'passport'
import { configureOAuth } from './config/oauth.js'
import _db from './config/db.js'
import { PORT } from './config/config.js'
import authRoutes from './routes/auth/auth-routes.js'
import oauthRoutes from './routes/auth/oauth-routes.js'
import userRoutes from './routes/auth/user-routes.js'
import accountRoutes from './routes/accounts/account-routes.js'
import invitationRoutes from './routes/invitations/invitation-routes.js'
import categoryRoutes from './routes/categories/category-routes.js'
import subcategoryRoutes from './routes/subcategories/subcategory-routes.js'
import transactionRoutes from './routes/transactions/transaction-routes.js'
import importRoutes from './routes/import/import-routes.js'
import aiRoutes from './routes/ai/ai-routes.js'
import investmentRoutes from './routes/investment/investment-routes.js'
import cryptoRoutes from './routes/crypto/crypto-routes.js'
import budgetRoutes from './routes/budget/budget-routes.js'
import { logAIStatus } from './services/ai/ai-client.js'
import { sanitizeBody, sanitizeQuery } from './middlewares/sanitizeMiddleware.js'
import { AppError } from './utils/app-error.js'
import { logger } from './utils/logger.js'

dotenv.config()

const app = express()

// 👇 Configuración para proxies como Render
app.set('trust proxy', 1)

// Passport.js for OAuth
app.use(passport.initialize())
configureOAuth()

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.coingecko.com https://api.frankfurter.app https://www.alphavantage.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  )
  next()
})
// CORS con credentials para cookies stackbp
const allowedOrigins = ['http://localhost:3000', process.env.FRONTEND_URL]
  .filter(Boolean)
  .map((url) => url?.replace(/\/$/, ''))

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (Postman, SSR, health checks)
      if (!origin) return callback(null, true)

      const normalizedOrigin = origin.replace(/\/$/, '')
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true)
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`))
    },
    credentials: true,
  })
)

// CORS con credentials para cookies
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//   credentials: true,
// }))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(cookieParser())

// Sanitization middleware (after body parsing)
app.use(sanitizeBody)
app.use(sanitizeQuery)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/auth', oauthRoutes) // OAuth routes (google, github)
app.use('/api/auth', cryptoRoutes) // GET/PUT /api/auth/keys
app.use('/api/users', userRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/invitations', invitationRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/subcategories', subcategoryRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/import', importRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/investment', investmentRoutes)
app.use('/api/budget', budgetRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('SERVER', 'errorHandler', 'Unhandled error', err)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    })
  }

  // Multer errors (file upload)
  if (err.name === 'MulterError') {
    const multerMessages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'El archivo supera el tamaño máximo permitido (5MB)',
      LIMIT_FILE_COUNT: 'Demasiados archivos',
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado',
      LIMIT_FIELD_KEY: 'Nombre de campo demasiado largo',
      LIMIT_FIELD_VALUE: 'Valor de campo demasiado largo',
      LIMIT_FIELD_COUNT: 'Demasiados campos',
      LIMIT_PART_COUNT: 'Demasiadas partes en la petición',
    }
    return res.status(400).json({
      success: false,
      error: multerMessages[err.message] || 'Error al procesar el archivo',
    })
  }

  // Custom file type error from multer fileFilter
  if (err.message && err.message.includes('Solo se permiten archivos')) {
    return res.status(400).json({
      success: false,
      error: err.message,
    })
  }

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  logAIStatus()
})
