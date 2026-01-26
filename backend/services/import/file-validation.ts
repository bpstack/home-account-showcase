/**
 * File content validation to prevent malicious file uploads.
 */

import { promisify } from 'util'
import { pipeline } from 'stream'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import xlsx from 'xlsx'
import type { Request, Response, NextFunction } from 'express'

const pipelineAsync = promisify(pipeline)

/**
 * Validate file content to prevent malicious uploads
 */
export const validateFileContent = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.file) {
      return next()
    }

    const { buffer, mimetype, originalname } = req.file
    
    // Check file size limit (10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'El archivo excede el tamaño máximo permitido (10MB)',
      })
    }

    // Check for malicious content based on MIME type
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
    console.error('Error en validación de archivo:', error)
    res.status(400).json({
      success: false,
      error: 'El archivo contiene contenido potencialmente malicioso y no puede ser procesado',
    })
  }
}

/**
 * Validate CSV content for injection attacks
 */
async function validateCSV(buffer: Buffer): Promise<void> {
  const content = buffer.toString('utf-8')
  
  // Check for formula injection patterns
  const dangerousPatterns = [
    /^\s*=[^=]/, // Excel formulas starting with =
    /^\s*\+[^+]/, // Formulas starting with +
    /^\s*-[^-]/, // Formulas starting with -
    /^\s*@[^@]/, // Formulas starting with @
    /javascript:/gi, // JavaScript URLs
    /data:text\/html/gi, // Data URLs
    /\bon\w+\s*=/gi, // Event handlers
    /<script/gi, // Script tags
    /<iframe/gi, // Iframes
  ]

  // Read first 10 lines for quick validation
  const lines = content.split('\n').slice(0, 10)
  
  for (const line of lines) {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(line)) {
        throw new Error('Contenido potencialmente malicioso detectado en CSV')
      }
    }
  }

  // Check for unusual character patterns
  const suspiciousChars = content.match(/[<>"']/g)
  if (suspiciousChars && suspiciousChars.length > content.length * 0.1) {
    // More than 10% of content has suspicious characters
    throw new Error('Contenido sospechoso detectado en CSV')
  }
}

/**
 * Validate Excel file content
 */
async function validateExcel(buffer: Buffer): Promise<void> {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    
    // Limit number of sheets
    if (workbook.SheetNames.length > 10) {
      throw new Error('Demasiadas hojas en el archivo Excel')
    }

    // Check each sheet for suspicious content
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1:A1')
      
      // Limit sheet size
      if ((range.e.r - range.s.r + 1) > 10000) {
        throw new Error('Demasiadas filas en la hoja de Excel')
      }

      // Check for formula cells
      for (const cellAddress in worksheet) {
        if (cellAddress[0] === '!') continue // Skip metadata
        
        const cell = worksheet[cellAddress]
        if (cell.f) {
          // Formula detected - check if it's simple or dangerous
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

          if (dangerousFormulas.some(f => formula.includes(f))) {
            throw new Error('Fórmula potencialmente peligrosa detectada en Excel')
          }
        }

        // Check for hyperlinks to dangerous URLs
        if (cell.l && cell.l.Target) {
          const url = cell.l.Target.toLowerCase()
          if (url.includes('javascript:') || url.includes('data:text/html')) {
            throw new Error('Hipervínculo peligroso detectado en Excel')
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('potencialmente peligrosa') || 
      error.message.includes('demasiadas') ||
      error.message.includes('peligroso')
    )) {
      throw error
    }
    // Si hay error en la lectura, asumir que el archivo está corrupto/malicioso
    throw new Error('El archivo Excel no es válido o está corrupto')
  }
}

export default {
  validateFileContent,
}