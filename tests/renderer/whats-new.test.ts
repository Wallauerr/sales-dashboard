import { describe, expect, it } from 'vitest'
import { WELCOME } from '../../src/renderer/src/lib/welcome'
import {
  readLastVersion,
  resolveWhatsNew,
  type VersionStorage,
  writeLastVersion,
} from '../../src/renderer/src/lib/whats-new'

function fakeStorage(): VersionStorage {
  const store = new Map<string, string>()
  return {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
  }
}

describe('tela de novidades', () => {
  it('primeira instalação mostra as boas-vindas', () => {
    expect(resolveWhatsNew('1.0.1', null)).toBe('welcome')
  })

  it('primeira abertura de quem já tem dados é tratada como atualização', () => {
    expect(resolveWhatsNew('1.0.1', null, true)).toBe('update')
  })

  it('versão diferente mostra as novidades da atualização', () => {
    expect(resolveWhatsNew('1.0.1', '1.0.0')).toBe('update')
  })

  it('mesma versão não mostra nada', () => {
    expect(resolveWhatsNew('1.0.1', '1.0.1')).toBeNull()
  })

  it('última versão vista é persistida e evita repetir o modal', () => {
    const storage = fakeStorage()
    expect(readLastVersion(storage)).toBeNull()
    writeLastVersion(storage, '1.0.1')
    expect(readLastVersion(storage)).toBe('1.0.1')
    expect(resolveWhatsNew('1.0.1', readLastVersion(storage))).toBeNull()
  })

  it('storage indisponível não quebra a inicialização', () => {
    const blocked: VersionStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readLastVersion(blocked)).toBeNull()
    expect(() => writeLastVersion(blocked, '1.0.1')).not.toThrow()
  })

  it('boas-vindas têm resumo, recursos e passos de uso', () => {
    expect(WELCOME.summary.length).toBeGreaterThan(0)
    expect(WELCOME.features.length).toBeGreaterThan(0)
    expect(WELCOME.steps.length).toBeGreaterThan(0)
  })
})
