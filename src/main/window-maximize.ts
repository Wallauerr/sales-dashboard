// Geometria pura, no formato de tela/ponto do Electron, para poder ser testada
// sem subir um BrowserWindow.

export interface Point {
  x: number
  y: number
}

export interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

export interface Screen {
  id: number
  workArea: Rectangle
}

function area(a: Rectangle, b: Rectangle): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

export function screenOfBounds(
  bounds: Rectangle,
  screens: Screen[],
): Screen | null {
  let best: Screen | null = null
  let maxArea = 0
  for (const screen of screens) {
    const a = area(bounds, screen.workArea)
    if (a > maxArea) {
      maxArea = a
      best = screen
    }
  }
  return best
}

// Distância medida até a borda da tela, não até o canto.
export function screenOfPoint(cursor: Point, screens: Screen[]): Screen | null {
  let best: Screen | null = null
  let minDist = Infinity
  for (const screen of screens) {
    const w = screen.workArea
    const dx = Math.max(w.x - cursor.x, 0, cursor.x - (w.x + w.width))
    const dy = Math.max(w.y - cursor.y, 0, cursor.y - (w.y + w.height))
    const d = Math.hypot(dx, dy)
    if (d < minDist) {
      minDist = d
      best = screen
    }
  }
  return best
}

export function cursorScreenBounds(
  cursor: Point,
  windowScreen: Screen | null,
  screens: Screen[],
): Rectangle | null {
  const target = screenOfPoint(cursor, screens)
  if (!target) return null
  if (windowScreen && target.id === windowScreen.id) return null
  return { ...target.workArea }
}

// Janela fora de tela não volta sozinha (não há borda para arrastar), então o
// tamanho salvo só vale se ainda encostar em alguma tela.
export function visibleBounds(bounds: Rectangle, screens: Screen[]): boolean {
  return screens.some(s => area(bounds, s.workArea) > 0)
}
