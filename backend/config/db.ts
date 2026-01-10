// config/db.ts

import mysql from 'mysql2/promise'
import type { Pool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// ========================================
// 🔧 CONFIGURACIÓN AIVEN
// ========================================
interface DBConfig {
  host: string
  port: number
  user: string
  password: string | undefined
  database: string
  ssl: {
    rejectUnauthorized: boolean
  }
}

const config: DBConfig = {
  host: process.env.AIVEN_DB_HOST || '',
  port: parseInt(process.env.AIVEN_DB_PORT || '23999'),
  user: process.env.AIVEN_DB_USER || 'avnadmin',
  password: process.env.AIVEN_PASSWORD,
  database: process.env.AIVEN_DB_NAME || 'home_account',
  ssl: {
    rejectUnauthorized: false, // Para desarrollo, en producción usar certificado
  },
}

// ========================================
// 🔍 VALIDACIÓN
// ========================================
if (!config.host) {
  throw new Error('❌ Falta AIVEN_DB_HOST en .env')
}

if (!config.password) {
  throw new Error('❌ Falta AIVEN_PASSWORD en .env')
}

// ========================================
// 📊 LOG DE CONFIGURACIÓN
// ========================================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`🗄️  MySQL Environment: AIVEN`)
console.log(`📍 Host: ${config.host}:${config.port}`)
console.log(`💾 Database: ${config.database}`)
console.log(`👤 User: ${config.user}`)
console.log(`🔐 SSL: Enabled`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// ========================================
// 🔌 POOL DE CONEXIONES
// ========================================
const pool: Pool = mysql.createPool(config)

// Verificar conexión al inicio
pool
  .getConnection()
  .then((connection) => {
    console.log('✅ Conexión MySQL exitosa')
    connection.release()
  })
  .catch((err) => {
    console.error('❌ Error de conexión MySQL:', err.message)
    process.exit(1)
  })

export default pool
