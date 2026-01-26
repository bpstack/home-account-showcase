import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import db from './config/db.js'
import { PORT } from './config/config.js'
import authRoutes from './routes/auth/auth-routes.js'
import userRoutes from './routes/auth/user-routes.js'
import accountRoutes from './routes/accounts/account-routes.js'
import categoryRoutes from './routes/categories/category-routes.js'
import subcategoryRoutes from './routes/subcategories/subcategory-routes.js'
import transactionRoutes from './routes/transactions/transaction-routes.js'
import importRoutes from './routes/import/import-routes.js'
import aiRoutes from './routes/ai/ai-routes.js'
import investmentRoutes from './routes/investment/investment-routes.js'
import { logAIStatus } from './services/ai/ai-client.js'
import { sanitizeBody, sanitizeQuery } from './middlewares/sanitizeMiddleware.js'

dotenv.config()

const app = express()

// 👇 Configuración para proxies como Render
app.set('trust proxy', 1)

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Content-Security-Policy', "default-src 'self'")
  next()
})
// CORS con credentials para cookies stackbp
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean).map(url => url?.replace(/\/$/, ''))

app.use(cors({
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
}))

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
app.use('/api/users', userRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/subcategories', subcategoryRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/import', importRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/investment', investmentRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  logAIStatus()
})
