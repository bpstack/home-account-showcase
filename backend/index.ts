import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import db from './config/db.js'
import { PORT } from './config/config.js'
import authRoutes from './routes/auth/auth-routes.js'
import accountRoutes from './routes/accounts/account-routes.js'
import categoryRoutes from './routes/categories/category-routes.js'
import subcategoryRoutes from './routes/subcategories/subcategory-routes.js'
import transactionRoutes from './routes/transactions/transaction-routes.js'
import importRoutes from './routes/import/import-routes.js'
import aiRoutes from './routes/ai/ai-routes.js'
import { logAIStatus } from './services/ai/ai-client.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/subcategories', subcategoryRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/import', importRoutes)
app.use('/api/ai', aiRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Test DB connection + tables
app.get('/api/test-db', async (req, res) => {
  try {
    // Test connection
    await db.query('SELECT 1 as test')

    // List tables
    const [tables] = await db.query('SHOW TABLES')

    // Count tables
    const tableList = (tables as any[]).map((t) => Object.values(t)[0])

    res.json({
      status: 'ok',
      connection: 'success',
      database: process.env.AIVEN_DB_NAME,
      tables: tableList,
      tableCount: tableList.length,
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: (error as Error).message,
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  logAIStatus()
})
