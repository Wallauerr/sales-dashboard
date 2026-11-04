import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_DASHBOARD_LAYOUT,
  loadDashboardLayout,
  saveDashboardLayout,
  shouldResetLayout,
} from '../../src/renderer/src/lib/dashboard-layout'

function installStorage(): Map<string, string> {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  })
  return store
}

describe('layout da dashboard', () => {
  beforeEach(() => {
    installStorage()
  })

  it('montar a grid não descarta o layout salvo', () => {
    expect(shouldResetLayout(0, 0)).toBe(false)
  })

  it('remontar com a mesma chave preserva o layout', () => {
    expect(shouldResetLayout(1, 1)).toBe(false)
  })

  it('restaurar padrão só reseta quando a chave muda', () => {
    expect(shouldResetLayout(1, 0)).toBe(true)
  })

  it('sem chave de reset o layout nunca é descartado', () => {
    expect(shouldResetLayout(undefined, 0)).toBe(false)
  })

  it('layout salvo sobrevive à recarga', () => {
    const custom = DEFAULT_DASHBOARD_LAYOUT.map(item =>
      item.i === 'regions' ? { ...item, x: 8, y: 12 } : item,
    )
    saveDashboardLayout(custom)

    const loaded = loadDashboardLayout()
    const regions = loaded.find(item => item.i === 'regions')

    expect(regions).toMatchObject({ x: 8, y: 12 })
  })
})
