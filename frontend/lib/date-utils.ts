export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayLocal(): string {
  return formatLocalDate(new Date())
}

export function createLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12, 0, 0)
}
