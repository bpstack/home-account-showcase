// config/config.ts

import * as dotenv from 'dotenv'

dotenv.config({ quiet: true })

// Verificación crítica
if (!process.env.SECRET_JWT_KEY) {
  throw new Error('❌ Falta SECRET_JWT_KEY en .env')
}

const pinServerKeyHex = process.env.PIN_SERVER_KEY
if (!pinServerKeyHex || !/^[0-9a-fA-F]{64}$/.test(pinServerKeyHex)) {
  throw new Error('❌ PIN_SERVER_KEY must be exactly 64 hexadecimal characters')
}

export const PORT: number = parseInt(process.env.PORT || '3001', 10)
export const SECRET_JWT_KEY: string = process.env.SECRET_JWT_KEY
export const SALT_ROUNDS: number = parseInt(process.env.SALT_ROUNDS || '10', 10)
export const PIN_SERVER_KEY: Buffer = Buffer.from(pinServerKeyHex, 'hex')

const config = {
  PORT,
  SECRET_JWT_KEY,
  SALT_ROUNDS,
  PIN_SERVER_KEY,
}

export default config
