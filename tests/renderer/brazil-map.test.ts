import { describe, expect, it } from 'vitest'
import {
  BRAZIL_BOUNDS,
  MAP_STATES,
  stateBubbles,
  unmappedStateValue,
} from '../../src/renderer/src/lib/brazil-map'

describe('mapa do Brasil', () => {
  it('mapeia as 27 UFs com limites válidos', () => {
    expect(MAP_STATES).toHaveLength(27)
    expect(new Set(MAP_STATES.map(state => state.uf)).size).toBe(27)
    expect(BRAZIL_BOUNDS.maxX).toBeGreaterThan(BRAZIL_BOUNDS.minX)
    expect(BRAZIL_BOUNDS.maxY).toBeGreaterThan(BRAZIL_BOUNDS.minY)
  })

  it('cria bolhas só para UFs válidas com faturamento', () => {
    const bubbles = stateBubbles([
      { state: 'sp', value: 100, share: 0.5 },
      { state: 'RJ', value: 50, share: 0.25 },
      { state: 'Não informado', value: 30, share: 0.15 },
      { state: 'Exterior', value: 20, share: 0.1 },
      { state: 'SC', value: 0, share: 0 },
    ])

    expect(bubbles.map(bubble => bubble.uf)).toEqual(['SP', 'RJ'])
    expect(bubbles[0]?.x).toBeLessThan(bubbles[1]?.x ?? 0)
  })

  it('soma o faturamento que fica fora do mapa', () => {
    expect(
      unmappedStateValue([
        { state: 'SP', value: 100, share: 0.5 },
        { state: 'Não informado', value: 30, share: 0.15 },
        { state: 'Exterior', value: 20, share: 0.1 },
        { state: '', value: 10, share: 0.05 },
      ]),
    ).toBe(60)
  })
})
