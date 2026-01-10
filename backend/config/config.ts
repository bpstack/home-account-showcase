// config/config.ts

import dotenv from 'dotenv'

dotenv.config()

// Verificación crítica
if (!process.env.SECRET_JWT_KEY) {
  throw new Error('❌ Falta SECRET_JWT_KEY en .env')
}

export const PORT: number = parseInt(process.env.PORT || '3001', 10)
export const SECRET_JWT_KEY: string = process.env.SECRET_JWT_KEY
export const SALT_ROUNDS: number = parseInt(process.env.SALT_ROUNDS || '10', 10)

const config = {
  PORT,
  SECRET_JWT_KEY,
  SALT_ROUNDS,
}

export default config
