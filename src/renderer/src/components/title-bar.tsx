import { CopyIcon, MinusIcon, SquareIcon, XIcon } from 'lucide-react'

import { useWindowMaximized } from '@/lib/useWindowMaximized'
import iconUrl from '../assets/icon.png'

export function TitleBar() {
  const maximized = useWindowMaximized()

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: barra de título arrastável nativa do Electron; duplo clique maximiza via API
    <div
      className="app-region-drag relative z-40 flex h-9 shrink-0 items-center justify-between border-b border-border bg-background pl-3 text-foreground select-none"
      onDoubleClick={() => void window.api?.toggleMaximize?.()}>
      <div className="flex min-w-0 items-center gap-2">
        <img
          src={iconUrl}
          alt=""
          className="h-5 w-5 rounded-sm object-contain"
        />
        <span className="truncate text-[13px] font-semibold tracking-tight font-heading">
          Sulmag
        </span>
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          — Metas Comercial
        </span>
      </div>
      <div className="app-region-no-drag flex h-full shrink-0 items-stretch">
        <button
          type="button"
          aria-label="Minimizar"
          onClick={() => void window.api?.minimize?.()}
          className="grid w-11 place-items-center text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
          <MinusIcon className="size-4" />
        </button>
        <button
          type="button"
          aria-label={maximized ? 'Restaurar' : 'Maximizar'}
          onClick={() => void window.api?.toggleMaximize?.()}
          className="grid w-11 place-items-center text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
          {maximized ? (
            <CopyIcon className="size-3.5" />
          ) : (
            <SquareIcon className="size-3" />
          )}
        </button>
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => void window.api?.closeWindow?.()}
          className="grid w-11 place-items-center text-muted-foreground outline-none transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}
