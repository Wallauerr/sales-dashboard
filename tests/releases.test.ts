import { describe, expect, it } from 'vitest'
import {
  formatReleaseDate,
  parseReleaseBody,
  type ReleaseNote,
  recentReleases,
  releaseFromApi,
} from '../src/shared/releases'

describe('notas de versão', () => {
  it('separa as seções do corpo do release', () => {
    const body = [
      '## Novidades',
      '- Dashboard novo',
      '- Filtros',
      '',
      '## Melhorias',
      '- Layout',
      '',
      '## Correções',
      '- Bug do total',
      '',
      '## Removido',
      '- Tela antiga',
    ].join('\n')

    expect(parseReleaseBody(body)).toEqual({
      highlights: ['Dashboard novo', 'Filtros'],
      improvements: ['Layout'],
      fixes: ['Bug do total'],
      removed: ['Tela antiga'],
    })
  })

  it('aceita variações de título e marcadores', () => {
    const body = [
      '### Novidades:',
      '* Item A',
      '',
      '### Correções',
      '+ Item B',
    ].join('\n')

    expect(parseReleaseBody(body)).toEqual({
      highlights: ['Item A'],
      improvements: undefined,
      fixes: ['Item B'],
      removed: undefined,
    })
  })

  it('sem títulos joga os itens em novidades', () => {
    expect(parseReleaseBody('- Item A\n- Item B')).toEqual({
      highlights: ['Item A', 'Item B'],
      improvements: undefined,
      fixes: undefined,
      removed: undefined,
    })
  })

  it('limpa markdown inline', () => {
    expect(
      parseReleaseBody('- **Novo** [link](https://example.com) `código`'),
    ).toEqual({
      highlights: ['Novo link código'],
      improvements: undefined,
      fixes: undefined,
      removed: undefined,
    })
  })

  it('converte a resposta da API do GitHub', () => {
    expect(
      releaseFromApi({
        tag_name: 'v1.0.2',
        published_at: '2026-11-10T12:00:00Z',
        body: '## Novidades\n- Item',
      }),
    ).toEqual({
      version: '1.0.2',
      date: '2026-11-10',
      highlights: ['Item'],
      improvements: undefined,
      fixes: undefined,
      removed: undefined,
    })
  })

  it('ignora tag vazia', () => {
    expect(releaseFromApi({ tag_name: 'v', body: '' })).toBeNull()
  })

  it('formata a data no padrão brasileiro', () => {
    expect(formatReleaseDate('2026-11-09')).toBe('09/11/2026')
    expect(formatReleaseDate('invalida')).toBe('invalida')
  })

  it('limita a lista às releases mais recentes', () => {
    const releases: ReleaseNote[] = [1, 2, 3, 4].map(index => ({
      version: `1.0.${index}`,
      date: '2026-11-09',
      highlights: ['Item'],
    }))

    expect(recentReleases(releases, 3).map(release => release.version)).toEqual(
      ['1.0.1', '1.0.2', '1.0.3'],
    )
  })
})
