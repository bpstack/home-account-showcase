import * as mysql from 'mysql2/promise'
import type { Pool } from 'mysql2/promise'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDevelopment = process.env.NODE_ENV === 'development'

// Las variables se llaman REMOTE_DB_*. Los nombres antiguos AIVEN_* se aceptan
// todavía, mientras se renombran en Render; se quitarán en un cambio posterior.
const legacyNamesUsed: string[] = []
const readEnv = (name: string, legacyName: string): string | undefined => {
  if (process.env[name]) return process.env[name]
  if (process.env[legacyName]) {
    legacyNamesUsed.push(legacyName)
    return process.env[legacyName]
  }
  return undefined
}

// SSL config: en desarrollo sin verificación, en producción con certificado CA
const getSSLConfig = () => {
  if (isDevelopment) {
    return { rejectUnauthorized: false }
  }

  // En producción, usar certificado desde variable de entorno
  const caCert = readEnv('REMOTE_DB_CA_CERT', 'AIVEN_CA_CERT')
  if (caCert) {
    return {
      ca: caCert,
      rejectUnauthorized: true,
    }
  }

  // Fallback: intentar leer archivo local si existe
  const certPath = path.join(__dirname, 'certs', 'ca.pem')
  if (fs.existsSync(certPath)) {
    return {
      ca: fs.readFileSync(certPath),
      rejectUnauthorized: true,
    }
  }

  // Si no hay certificado, usar modo inseguro con warning
  console.warn('⚠️  SSL: No CA certificate found, using rejectUnauthorized: false')
  return { rejectUnauthorized: false }
}

const config = {
  host: readEnv('REMOTE_DB_HOST', 'AIVEN_DB_HOST') || '',
  // El nombre antiguo del puerto era AIVEN_PORT (no AIVEN_DB_PORT)
  port: Number(readEnv('REMOTE_DB_PORT', 'AIVEN_PORT') || 3306),
  user: readEnv('REMOTE_DB_USER', 'AIVEN_DB_USER') || '',
  password: readEnv('REMOTE_DB_PASSWORD', 'AIVEN_PASSWORD'),
  database: readEnv('REMOTE_DB_NAME', 'AIVEN_DB_NAME') || 'home_account',
  charset: 'utf8mb4',
  ssl: getSSLConfig(),
}

if (!config.host) throw new Error('❌ Falta REMOTE_DB_HOST')
if (!config.user) throw new Error('❌ Falta REMOTE_DB_USER')
if (!config.password) throw new Error('❌ Falta REMOTE_DB_PASSWORD')

if (legacyNamesUsed.length > 0) {
  console.warn(
    `⚠️  DB: usando nombres antiguos (${legacyNamesUsed.join(', ')}); renómbralos a REMOTE_DB_*`
  )
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🗄️  MySQL Environment: REMOTE')
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
  connectTimeout: 30000,
})

// Retry connection test for cold starts
const testConnection = async (retries = 3, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection()
      console.log('✅ Conexión MySQL exitosa')
      connection.release()
      return
    } catch (err: any) {
      if (i < retries - 1) {
        console.log(
          `⏳ MySQL connection attempt ${i + 1}/${retries} failed, retrying in ${delay / 1000}s...`
        )
        await new Promise((r) => setTimeout(r, delay))
      } else {
        console.error('❌ Error inicial MySQL:', err.message)
      }
    }
  }
}

testConnection()

export default pool
