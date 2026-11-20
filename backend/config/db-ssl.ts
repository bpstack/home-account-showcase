import * as fs from 'fs'

export type DbSsl = { ca: string | Buffer; rejectUnauthorized: true }

// TLS for MySQL always checks the server's certificate, in every environment. Without a CA there
// is nothing to check it against, so the app refuses to start instead of connecting blind: a
// missing certificate shows up at once rather than silently weakening the connection.
export function getDbSsl(caFromEnv: string | undefined, caFilePath: string): DbSsl {
  if (caFromEnv) return { ca: caFromEnv, rejectUnauthorized: true }
  if (fs.existsSync(caFilePath))
    return { ca: fs.readFileSync(caFilePath), rejectUnauthorized: true }
  throw new Error(
    '❌ No CA certificate for MySQL: refusing to connect without verifying the server'
  )
}
