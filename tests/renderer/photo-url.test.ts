import { describe, expect, it } from 'vitest'
import { photoUrl } from '../../src/renderer/src/lib/photo-url'

describe('photoUrl', () => {
  it('monta URL foto:// com o vendedor codificado', () => {
    expect(photoUrl('Ana Lúcia Sá')).toBe(
      'photo://img/Ana%20L%C3%BAcia%20S%C3%A1',
    )
  })
})
