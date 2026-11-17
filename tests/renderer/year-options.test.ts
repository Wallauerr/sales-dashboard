import { describe, expect, it } from 'vitest'
import { yearOptions } from '../../src/renderer/src/lib/year-options'

describe('opções do seletor de anos', () => {
  it('mostra todos os anos quando há até 5', () => {
    expect(yearOptions([2026, 2025, 2024, 2023, 2022], null)).toEqual({
      visible: [2026, 2025, 2024, 2023, 2022],
      hidden: [],
    })
  })

  it('mantém os 5 mais recentes e esconde os antigos', () => {
    expect(
      yearOptions([2026, 2025, 2024, 2023, 2022, 2021, 2020], null),
    ).toEqual({
      visible: [2026, 2025, 2024, 2023, 2022],
      hidden: [2021, 2020],
    })
  })

  it('pina o ano selecionado antigo no lugar do mais antigo visível', () => {
    expect(
      yearOptions([2026, 2025, 2024, 2023, 2022, 2021, 2020], 2020),
    ).toEqual({
      visible: [2026, 2025, 2024, 2023, 2020],
      hidden: [2022, 2021],
    })
  })

  it('não altera a lista quando o ano selecionado já está visível', () => {
    expect(yearOptions([2026, 2025, 2024, 2023, 2022, 2021], 2023)).toEqual({
      visible: [2026, 2025, 2024, 2023, 2022],
      hidden: [2021],
    })
  })

  it('ordena, remove duplicados e ignora seleção fora da lista', () => {
    expect(yearOptions([2024, 2026, 2025, 2024], 2020)).toEqual({
      visible: [2026, 2025, 2024],
      hidden: [],
    })
  })

  it('respeita o limite de 3 pills e pina o selecionado', () => {
    expect(yearOptions([2026, 2025, 2024, 2023], 2023, 3)).toEqual({
      visible: [2026, 2025, 2023],
      hidden: [2024],
    })
  })

  it('lista vazia não tem anos visíveis nem escondidos', () => {
    expect(yearOptions([], null)).toEqual({ visible: [], hidden: [] })
  })
})
