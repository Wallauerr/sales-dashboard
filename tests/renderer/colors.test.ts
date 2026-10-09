import { describe, expect, it } from 'vitest'
import { chartColor } from '../../src/renderer/src/lib/colors'

describe('chartColor', () => {
  it('mapeia o índice para a variável CSS do chart', () => {
    expect(chartColor(1)).toBe('var(--chart-1)')
    expect(chartColor(5)).toBe('var(--chart-5)')
  })
})
