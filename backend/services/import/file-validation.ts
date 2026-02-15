/**
 * File content validation to prevent malicious file uploads.
 */

import { promisify } from 'util'
import { pipeline } from 'stream'
import xlsx from 'xlsx'
import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../../utils/app-error.js'
import { logger } from '../../utils/logger.js'

const _pipelineAsync = promisify(pipeline)

/**
 * Validate file content to prevent malicious uploads
 */
export const validateFileContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.file) {
      return next()
    }

    const { buffer, mimetype, originalname } = req.file

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File exceeds maximum allowed size (5MB)',
      })
    }

    if (mimetype === 'text/csv' || originalname.toLowerCase().endsWith('.csv')) {
      await validateCSV(buffer)
    } else if (
      mimetype.includes('excel') ||
      originalname.toLowerCase().endsWith('.xls') ||
      originalname.toLowerCase().endsWith('.xlsx')
    ) {
      await validateExcel(buffer)
    }

    next()
  } catch (error) {
    logger.error('IMPORT_VALIDATE', 'validateFileContent', 'Error validating file', error as Error)
    res.status(400).json({
      success: false,
      error: 'File contains potentially malicious content and cannot be processed',
    })
  }
}

/**
 * Validate CSV content for injection attacks
 */
async function validateCSV(buffer: Buffer): Promise<void> {
  const content = buffer.toString('utf-8')

  const dangerousPatterns = [
    /^\s*=[^=]/,
    /^\s*\+[^+]/,
    /^\s*-[^-]/,
    /^\s*@[^@]/,
    /javascript:/gi,
    /data:text\/html/gi,
    /\bon\w+\s*=/gi,
    /<script/gi,
    /<iframe/gi,
  ]

  const lines = content.split('\n').slice(0, 10)

  for (const line of lines) {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(line)) {
        throw new AppError('Potentially malicious content detected in CSV', 400)
      }
    }
  }

  const suspiciousChars = content.match(/[<>"']/g)
  if (suspiciousChars && suspiciousChars.length > content.length * 0.1) {
    throw new AppError('Suspicious content detected in CSV', 400)
  }
}

/**
 * Validate Excel file content
 */
async function validateExcel(buffer: Buffer): Promise<void> {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' })

    if (workbook.SheetNames.length > 10) {
      throw new AppError('Too many sheets in Excel file', 400)
    }

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1:A1')

      if (range.e.r - range.s.r + 1 > 10000) {
        throw new AppError('Too many rows in Excel sheet', 400)
      }

      for (const cellAddress in worksheet) {
        if (cellAddress[0] === '!') continue

        const cell = worksheet[cellAddress]
        if (cell.f) {
          const formula = cell.f.toLowerCase()
          const dangerousFormulas = [
            'cmd',
            'powershell',
            'shell',
            'execute',
            'run',
            'eval',
            'javascript',
            'vbscript',
          ]

          if (dangerousFormulas.some((f) => formula.includes(f))) {
            throw new AppError('Potentially dangerous formula detected in Excel', 400)
          }
        }

        if (cell.l && cell.l.Target) {
          const url = cell.l.Target.toLowerCase()
          if (url.includes('javascript:') || url.includes('data:text/html')) {
            throw new AppError('Dangerous hyperlink detected in Excel', 400)
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError('Invalid or corrupted Excel file', 400)
  }
}

export default {
  validateFileContent,
}
