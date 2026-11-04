import { describe, expect, it } from 'vitest'
import { errorMessage } from '../../src/renderer/src/lib/errors'

describe('mensagem de erro', () => {
  it('remove o prefixo do IPC do Electron', () => {
    const error = new Error(
      "Error invoking remote method 'ingest:import': Error: Planilha inválida",
    )
    expect(errorMessage(error)).toBe('Planilha inválida')
  })

  it('mantém mensagens normais de Error', () => {
    expect(errorMessage(new Error('Falha ao salvar'))).toBe('Falha ao salvar')
  })

  it('aceita string lançada', () => {
    expect(errorMessage('Arquivo não encontrado')).toBe(
      'Arquivo não encontrado',
    )
  })

  it('usa mensagem padrão quando não há informação', () => {
    expect(errorMessage(null)).toBe('Ocorreu um erro inesperado.')
    expect(errorMessage(new Error('   '))).toBe('Ocorreu um erro inesperado.')
  })

  it('permite mensagem padrão customizada', () => {
    expect(errorMessage(undefined, 'Não foi possível importar.')).toBe(
      'Não foi possível importar.',
    )
  })
})
