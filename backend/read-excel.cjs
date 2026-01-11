const XLSX = require('xlsx')

const wb = XLSX.readFile('./docs/2025-CONTROL DE GASTOS.xlsx')

console.log('=== HOJAS DISPONIBLES ===')
console.log(wb.SheetNames.join('\n'))

console.log('\n=== CONTENIDO DE CADA HOJA ===')
wb.SheetNames.forEach((sheetName, index) => {
  console.log(`\n--- ${sheetName} ---`)
  const ws = wb.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 })
  data.forEach((row, rowIndex) => {
    if (rowIndex < 20) { // Solo primeras 20 filas
      console.log(row.join(' | '))
    }
  })
})
