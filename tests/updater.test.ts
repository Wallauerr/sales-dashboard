import { describe, expect, it } from 'vitest'
import { idleUpdateState, shouldAutoUpdate } from '../src/main/updater/rules.ts'

describe('shouldAutoUpdate', () => {
  it('só atualiza em produção empacotada no Windows', () => {
    expect(shouldAutoUpdate('prod', true, 'win32')).toBe(true)
    expect(shouldAutoUpdate('prod', false, 'win32')).toBe(false)
    expect(shouldAutoUpdate('dev', true, 'win32')).toBe(false)
    expect(shouldAutoUpdate('test', true, 'win32')).toBe(false)
    expect(shouldAutoUpdate('prod', true, 'linux')).toBe(false)
    expect(shouldAutoUpdate('prod', true, 'darwin')).toBe(false)
  })
})

describe('idleUpdateState', () => {
  it('começa ocioso, sem versão e sem erro', () => {
    expect(idleUpdateState()).toEqual({
      status: 'idle',
      version: null,
      percent: null,
      message: null,
    })
  })
})
