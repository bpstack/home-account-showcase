import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterAll, describe, expect, it } from 'vitest'
import { getDbSsl } from './db-ssl.js'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'db-ssl-'))
const caFile = path.join(dir, 'ca.pem')
fs.writeFileSync(caFile, 'FILE-CA')
const missingFile = path.join(dir, 'missing.pem')

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

describe('getDbSsl', () => {
  it('verifies the server with the CA from the environment', () => {
    expect(getDbSsl('ENV-CA', missingFile)).toEqual({ ca: 'ENV-CA', rejectUnauthorized: true })
  })

  it('verifies the server with the CA file when the environment has none', () => {
    const ssl = getDbSsl(undefined, caFile)
    expect(ssl.rejectUnauthorized).toBe(true)
    expect(String(ssl.ca)).toBe('FILE-CA')
  })

  it('verifies the server in development too', () => {
    const before = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    try {
      expect(getDbSsl('ENV-CA', missingFile).rejectUnauthorized).toBe(true)
    } finally {
      process.env.NODE_ENV = before
    }
  })

  it('refuses to start without a CA instead of connecting unverified', () => {
    expect(() => getDbSsl(undefined, missingFile)).toThrow(/without verifying/)
    expect(() => getDbSsl('', missingFile)).toThrow(/without verifying/)
  })
})
