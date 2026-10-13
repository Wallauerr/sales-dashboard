import { describe, expect, it } from 'vitest'
import {
  cursorScreenBounds,
  type Rectangle,
  type Screen,
  screenOfBounds,
  screenOfPoint,
  visibleBounds,
} from '../src/main/window-maximize.ts'

describe('maximizar/restaurar janela em multi-monitor', () => {
  const screens: Screen[] = [
    { id: 1, workArea: { x: 0, y: 0, width: 1280, height: 800 } },
    { id: 2, workArea: { x: 1280, y: 0, width: 2560, height: 1440 } },
  ]
  const windowOnLeft: Rectangle = { x: 40, y: 60, width: 1280, height: 840 }

  it('identifica a tela por maior interceptação da janela', () => {
    expect(screenOfBounds(windowOnLeft, screens)?.id).toBe(1)
    expect(
      screenOfBounds({ x: 1240, y: 100, width: 1280, height: 840 }, screens)
        ?.id,
    ).toBe(2)
    expect(
      screenOfBounds({ x: 30, y: 100, width: 1280, height: 840 }, screens)?.id,
    ).toBe(1)
  })

  it('identifica a tela do ponto do cursor', () => {
    expect(screenOfPoint({ x: 300, y: 400 }, screens)?.id).toBe(1)
    expect(screenOfPoint({ x: 3000, y: 700 }, screens)?.id).toBe(2)
    expect(screenOfPoint({ x: 1279, y: 799 }, screens)?.id).toBe(1)
  })

  it('maximiza na tela do cursor e ignora tela inexistente', () => {
    expect(
      cursorScreenBounds(
        { x: 300, y: 400 },
        screenOfBounds(windowOnLeft, screens),
        screens,
      ),
    ).toBeNull()
    expect(
      cursorScreenBounds(
        { x: 3000, y: 700 },
        screenOfBounds(windowOnLeft, screens),
        screens,
      ),
    ).toEqual(screens[1].workArea)
    expect(cursorScreenBounds({ x: 3000, y: 700 }, null, screens)).toEqual(
      screens[1].workArea,
    )
    expect(cursorScreenBounds({ x: 1, y: 1 }, null, [])).toBeNull()
  })

  it('decide se a janela continua visível em algum monitor', () => {
    expect(visibleBounds(windowOnLeft, screens)).toBe(true)
    expect(
      visibleBounds({ x: -3000, y: 0, width: 1280, height: 840 }, screens),
    ).toBe(false)
    expect(visibleBounds(windowOnLeft, [])).toBe(false)
  })
})
