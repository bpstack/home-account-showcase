import * as mysql from 'mysql2/promise'
import type { Pool } from 'mysql2/promise'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { getDbSsl } from './db-ssl.js'

dotenv.config({ quiet: true })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const config = {
  host: process.env.REMOTE_DB_HOST || '',
  port: Number(process.env.REMOTE_DB_PORT || 3306),
  user: process.env.REMOTE_DB_USER || '',
  password: process.env.REMOTE_DB_PASSWORD,
  database: process.env.REMOTE_DB_NAME || 'home_account',
  charset: 'utf8mb4',
  // The database keeps its dates in UTC. Without this, mysql2 reads and writes them in the time
  // zone of the machine running Node: an hour off on a machine in Spain, and a DATE one day early
  // once it goes out as JSON.
  timezone: 'Z',
  // The CA comes from the environment (production) or from a local file kept out of git
  ssl: getDbSsl(process.env.REMOTE_DB_CA_CERT, path.join(__dirname, 'certs', 'ca.pem')),
}

if (!config.host) throw new Error('❌ Falta REMOTE_DB_HOST')
if (!config.user) throw new Error('❌ Falta REMOTE_DB_USER')
if (!config.password) throw new Error('❌ Falta REMOTE_DB_PASSWORD')

// Only what tells whether the connection is safe: the host, database and user stay out of the
// log, which in production is read outside the server.
console.log('🗄️  MySQL over TLS, certificate verified')

const pool: Pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000,
})

// Each connection works in UTC whatever the server's own time zone, so NOW() and TIMESTAMP
// columns agree with `timezone: 'Z'` above. The event hands over the core (callback) connection,
// not the promise one its type says: the query runs before any other on that connection.
pool.on('connection', (connection) => {
  void connection.query("SET time_zone = '+00:00'")
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
