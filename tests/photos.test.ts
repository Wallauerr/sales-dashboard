import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { SalesDatabase } from '../src/main/db/database.ts'
import { PHOTO_MAX_BYTES, readChosenPhoto } from '../src/main/photos/pick.ts'

describe('foto dos vendedores', () => {
  it('grava, sobrescreve sem duplicar e remove', () => {
    const db = SalesDatabase.open(new DatabaseSync(':memory:'))

    db.setSellerPhoto('Rosemeri', 'image/jpeg', Buffer.from([1, 2, 3, 4]))
    expect(db.listSellerPhotos().map(f => f.seller)).toEqual(['Rosemeri'])
    expect(db.getSellerPhoto('Rosemeri')?.mime).toBe('image/jpeg')
    expect((db.getSellerPhoto('Rosemeri')?.img.length ?? 0) > 0).toBe(true)

    db.setSellerPhoto('Rosemeri', 'image/png', Buffer.from([9, 9]))
    expect(db.getSellerPhoto('Rosemeri')?.mime).toBe('image/png')
    expect(db.listSellerPhotos()).toHaveLength(1)

    db.removeSellerPhoto('Rosemeri')
    expect(db.getSellerPhoto('Rosemeri')).toBeNull()
  })

  it('valida a foto escolhida por tipo, tamanho e assinatura', async () => {
    const naoImagem = join(tmpdir(), `nao-imagem-${Date.now()}.txt`)
    writeFileSync(naoImagem, 'isto nao e uma imagem')
    await expect(readChosenPhoto(naoImagem)).rejects.toThrow(/não é uma imagem/)

    const grande = join(tmpdir(), `grande-${Date.now()}.png`)
    writeFileSync(grande, Buffer.alloc(PHOTO_MAX_BYTES + 1))
    await expect(readChosenPhoto(grande)).rejects.toThrow(/limite é/)

    const jpg = join(tmpdir(), `foto-${Date.now()}.jpg`)
    writeFileSync(jpg, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]))
    await expect(readChosenPhoto(jpg)).resolves.toMatchObject({
      mime: 'image/jpeg',
    })
  })
})
