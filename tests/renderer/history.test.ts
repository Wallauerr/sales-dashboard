import { describe, expect, it } from 'vitest'
import {
  activeImportYear,
  filterImportsByPeriod,
  importYears,
} from '../../src/renderer/src/lib/history'
import type { ImportRecord } from '../../src/shared/types'

function record(id: number, importedAt: string): ImportRecord {
  return {
    id,
    filePath: `planilha-${id}.xlsx`,
    totalRows: 10,
    inserted: 1,
    updated: 2,
    discarded: 3,
    importedAt,
  }
}

describe('filtro do histórico', () => {
  it('lista só os anos com imports, do mais recente para o mais antigo', () => {
    const imports = [
      record(1, '2024-03-10T10:00:00.000Z'),
      record(2, '2023-12-01T10:00:00.000Z'),
      record(3, '2024-08-20T10:00:00.000Z'),
    ]

    expect(importYears(imports)).toEqual([2024, 2023])
  })

  it('ano inicial do histórico ignora o ano da dashboard sem imports', () => {
    const imports = [record(1, '2024-03-10T10:00:00.000Z')]

    expect(activeImportYear(importYears(imports), 2025)).toBe(2024)
  })

  it('mantém o ano escolhido quando ele tem imports', () => {
    const imports = [
      record(1, '2024-03-10T10:00:00.000Z'),
      record(2, '2023-12-01T10:00:00.000Z'),
    ]

    expect(activeImportYear(importYears(imports), 2023)).toBe(2023)
  })

  it('filtra imports pelo ano escolhido', () => {
    const imports = [
      record(1, '2024-03-10T10:00:00.000Z'),
      record(2, '2023-12-01T10:00:00.000Z'),
    ]

    expect(filterImportsByPeriod(imports, 2024, []).map(i => i.id)).toEqual([1])
  })

  it('filtra imports pelos meses escolhidos dentro do ano', () => {
    const imports = [
      record(1, '2024-03-10T10:00:00.000Z'),
      record(2, '2024-08-20T10:00:00.000Z'),
    ]

    expect(
      filterImportsByPeriod(imports, 2024, ['ago']).map(i => i.id),
    ).toEqual([2])
  })

  it('sem meses, mantém todos os imports do ano', () => {
    const imports = [
      record(1, '2024-03-10T10:00:00.000Z'),
      record(2, '2024-08-20T10:00:00.000Z'),
      record(3, '2023-08-20T10:00:00.000Z'),
    ]

    expect(filterImportsByPeriod(imports, 2024, []).map(i => i.id)).toEqual([
      1, 2,
    ])
  })
})
