import mysql from 'mysql2/promise'
import type { Pool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const config = {
  host: process.env.AIVEN_DB_HOST || '',
  port: Number(process.env.AIVEN_PORT || 23999),
  user: process.env.AIVEN_DB_USER || 'avnadmin',
  password: process.env.AIVEN_PASSWORD,
  database: process.env.AIVEN_DB_NAME || 'home_account',
  charset: 'utf8mb4',
  ssl: {
    rejectUnauthorized: false,
  },
}

if (!config.host) throw new Error('❌ Falta AIVEN_DB_HOST')
if (!config.password) throw new Error('❌ Falta AIVEN_PASSWORD')

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🗄️  MySQL Environment: AIVEN')
console.log(`📍 Host: ${config.host}:${config.port}`)
console.log(`💾 Database: ${config.database}`)
console.log(`👤 User: ${config.user}`)
console.log(`🔐 SSL: Enabled`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const pool: Pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
})

pool.getConnection()
  .then((connection) => {
    console.log('✅ Conexión MySQL exitosa')
    connection.release()
  })
  .catch((err) => {
    console.error('❌ Error inicial MySQL:', err.message)
  })

export default pool
