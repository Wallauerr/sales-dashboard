import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  applyTheme,
  documentTheme,
  resolveTheme,
  type ThemeRoot,
} from '../../src/renderer/src/lib/theme'

const css = readFileSync(
  fileURLToPath(new URL('../../src/renderer/src/index.css', import.meta.url)),
  'utf8',
)

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`missing ${selector}`)
  const end = css.indexOf('}', start)
  const body = css.slice(start + selector.length + 2, end)
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(match => [
      match[1],
      match[2].trim(),
    ]),
  )
}

function token(tokens: Record<string, string>, name: string): string {
  const value = tokens[name]
  if (!value) throw new Error(`missing --${name}`)
  return value
}

function luminance(color: string): number {
  const channels = color.slice(1).match(/../g) ?? []
  if (channels.length !== 3) throw new Error(`invalid color: ${color}`)
  const [r = 0, g = 0, b = 0] = channels.map(channel => {
    const value = Number.parseInt(channel, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}

const light = block(':root')

describe('tema claro', () => {
  it('não usa branco absoluto em cards e popovers', () => {
    expect(token(light, 'card').toLowerCase()).not.toBe('#ffffff')
    expect(token(light, 'popover').toLowerCase()).not.toBe('#ffffff')
  })

  it('mantém contraste legível no texto', () => {
    const background = token(light, 'background')
    const card = token(light, 'card')

    expect(
      contrast(token(light, 'foreground'), background),
    ).toBeGreaterThanOrEqual(7)
    expect(contrast(token(light, 'foreground'), card)).toBeGreaterThanOrEqual(7)
    expect(
      contrast(token(light, 'muted-foreground'), background),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(token(light, 'muted-foreground'), card),
    ).toBeGreaterThanOrEqual(4.5)
  })
})

describe('preferência de tema', () => {
  it('respeita o valor salvo e cai para a preferência do sistema', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
  })

  it('aplica a classe e o color-scheme no elemento raiz', () => {
    const toggles: [string, boolean][] = []
    const classes = new Set<string>()
    const root = {
      classList: {
        contains: (name: string) => classes.has(name),
        toggle: (name: string, force: boolean) => {
          toggles.push([name, force])
          if (force) classes.add(name)
          else classes.delete(name)
        },
      },
      style: { colorScheme: '' },
    } satisfies ThemeRoot

    applyTheme('dark', root)

    expect(toggles).toEqual([['dark', true]])
    expect(root.style.colorScheme).toBe('dark')
    expect(documentTheme(root)).toBe('dark')

    applyTheme('light', root)

    expect(toggles).toEqual([
      ['dark', true],
      ['dark', false],
    ])
    expect(root.style.colorScheme).toBe('light')
    expect(documentTheme(root)).toBe('light')
  })
})
