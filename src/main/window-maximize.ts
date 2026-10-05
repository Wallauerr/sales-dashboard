// Geometria pura, no formato de tela/ponto do Electron, para poder ser testada
// sem subir um BrowserWindow.

export interface Ponto {
  x: number
  y: number
}

export interface Retangulo {
  x: number
  y: number
  width: number
  height: number
}

export interface Tela {
  id: number
  workArea: Retangulo
}

function area(a: Retangulo, b: Retangulo): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

export function telaDosBounds(bounds: Retangulo, telas: Tela[]): Tela | null {
  let melhor: Tela | null = null
  let maior = 0
  for (const tela of telas) {
    const a = area(bounds, tela.workArea)
    if (a > maior) {
      maior = a
      melhor = tela
    }
  }
  return melhor
}

// Distância medida até a borda da tela, não até o canto.
export function telaDoPonto(cursor: Ponto, telas: Tela[]): Tela | null {
  let melhor: Tela | null = null
  let menor = Infinity
  for (const tela of telas) {
    const w = tela.workArea
    const dx = Math.max(w.x - cursor.x, 0, cursor.x - (w.x + w.width))
    const dy = Math.max(w.y - cursor.y, 0, cursor.y - (w.y + w.height))
    const d = Math.hypot(dx, dy)
    if (d < menor) {
      menor = d
      melhor = tela
    }
  }
  return melhor
}

export function boundsDaTelaDoCursor(
  cursor: Ponto,
  telaDaJanela: Tela | null,
  telas: Tela[],
): Retangulo | null {
  const alvo = telaDoPonto(cursor, telas)
  if (!alvo) return null
  if (telaDaJanela && alvo.id === telaDaJanela.id) return null
  return { ...alvo.workArea }
}

// Janela fora de tela não volta sozinha (não há borda para arrastar), então o
// tamanho salvo só vale se ainda encostar em alguma tela.
export function boundsVisiveis(bounds: Retangulo, telas: Tela[]): boolean {
  return telas.some(t => area(bounds, t.workArea) > 0)
}
