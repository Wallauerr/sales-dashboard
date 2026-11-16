import type { ImportRecord, Month } from '../../../shared/types'

const MONTH_NUM: Record<Month, string> = {
  jan: '01',
  fev: '02',
  mar: '03',
  abr: '04',
  mai: '05',
  jun: '06',
  jul: '07',
  ago: '08',
  set: '09',
  out: '10',
  nov: '11',
  dez: '12',
}

export function importYears(imports: ImportRecord[]): number[] {
  const years = new Set<number>()
  for (const item of imports) {
    const year = Number(item.importedAt.slice(0, 4))
    if (Number.isInteger(year)) years.add(year)
  }
  return [...years].sort((a, b) => b - a)
}

export function activeImportYear(
  years: number[],
  selected: number | null,
): number | null {
  return selected !== null && years.includes(selected)
    ? selected
    : (years[0] ?? null)
}

export function filterImportsByPeriod(
  imports: ImportRecord[],
  year: number,
  months: Month[],
): ImportRecord[] {
  const yearPrefix = `${year}-`
  return imports.filter(item => {
    if (!item.importedAt.startsWith(yearPrefix)) return false
    if (months.length === 0) return true
    return months.some(
      month => item.importedAt.slice(5, 7) === MONTH_NUM[month],
    )
  })
}
