// Maximizar/restaurar em multi-monitor. A geometria fica em funções puras,
// testáveis sem Electron; o index.ts só traduz isso para BrowserWindow.

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

// Tela com maior área em comum com a janela, como o getDisplayMatching do
// Electron.
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

// A tela mais próxima do cursor, com distância medida até a borda da tela (e
// não até o canto), como no getDisplayNearestPoint do Electron.
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

// Onde a janela tem que ir antes de maximizar para cair na tela do cursor, ou
// null se ela já está lá (caso comum: um monitor só).
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

// Descombrir para uma janela fora de tela é beco sem saída: sem borda para
// arrastar de volta. Só restaura se o último tamanho ainda encosta em alguma
// tela — o monitor pode ter sido desligado no meio do maximize.
export function boundsVisiveis(bounds: Retangulo, telas: Tela[]): boolean {
  return telas.some(t => area(bounds, t.workArea) > 0)
}
