import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  canSeed,
  databasePath,
  defaultUserData,
  resolveAppEnv,
} from '../src/main/env.ts'

describe('resolução de ambiente', () => {
  it('build empacotado roda em produção', () => {
    expect(resolveAppEnv({ isPackaged: true })).toBe('prod')
  })

  it('build não empacotado roda em desenvolvimento', () => {
    expect(resolveAppEnv({ isPackaged: false })).toBe('dev')
  })

  it('NODE_ENV=test roda em teste', () => {
    expect(resolveAppEnv({ isPackaged: false, nodeEnv: 'test' })).toBe('test')
  })

  it('override explícito vence o empacotamento', () => {
    expect(resolveAppEnv({ isPackaged: true, env: 'dev' })).toBe('dev')
    expect(resolveAppEnv({ isPackaged: false, env: 'test' })).toBe('test')
  })

  it('override inválido é ignorado', () => {
    expect(resolveAppEnv({ isPackaged: true, env: 'staging' })).toBe('prod')
  })
})

describe('caminho do banco por ambiente', () => {
  it('produção usa a raiz do userData', () => {
    expect(databasePath('/dados', 'prod')).toBe(join('/dados', 'metas.db'))
  })

  it('dev e test usam pastas próprias', () => {
    expect(databasePath('/dados', 'dev')).toBe(
      join('/dados', 'dev', 'metas.db'),
    )
    expect(databasePath('/dados', 'test')).toBe(
      join('/dados', 'test', 'metas.db'),
    )
  })

  it('userData sobrescrito mantém a pasta do ambiente', () => {
    expect(databasePath('/dados', 'test', '/tmp/e2e')).toBe(
      join('/tmp/e2e', 'test', 'metas.db'),
    )
  })
})

describe('userData padrão', () => {
  it('linux usa XDG_CONFIG_HOME quando existe', () => {
    expect(
      defaultUserData({
        platform: 'linux',
        home: '/home/u',
        xdgConfig: '/xdg',
      }),
    ).toBe(join('/xdg', 'sales-dashboard'))
  })

  it('linux sem XDG cai em ~/.config', () => {
    expect(defaultUserData({ platform: 'linux', home: '/home/u' })).toBe(
      join('/home/u', '.config', 'sales-dashboard'),
    )
  })

  it('windows usa APPDATA', () => {
    expect(
      defaultUserData({
        platform: 'win32',
        home: 'C:\\Users\\u',
        appData: 'C:\\AppData',
      }),
    ).toBe(join('C:\\AppData', 'sales-dashboard'))
  })

  it('macOS usa Application Support', () => {
    expect(defaultUserData({ platform: 'darwin', home: '/Users/u' })).toBe(
      join('/Users/u', 'Library', 'Application Support', 'sales-dashboard'),
    )
  })
})

describe('seed por ambiente', () => {
  it('libera seed em dev e test', () => {
    expect(canSeed('dev')).toBe(true)
    expect(canSeed('test')).toBe(true)
  })

  it('bloqueia seed em produção', () => {
    expect(canSeed('prod')).toBe(false)
  })
})
