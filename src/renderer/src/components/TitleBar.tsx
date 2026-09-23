import { CopyIcon, GripIcon, MinusIcon, SquareIcon, XIcon } from "lucide-react";

import { useWindowMaximized } from "@/lib/useWindowMaximized";
import iconUrl from "../assets/icon.png";

export default function TitleBar() {
  const maximized = useWindowMaximized();

  return (
    <div
      className="app-region-drag relative z-40 flex h-9 shrink-0 items-center justify-between border-b border-white/10 bg-[#0b0b0d] pl-3 text-white select-none"
      onDoubleClick={() => void window.api?.toggleMaximize?.()}
    >
      <div className="flex min-w-0 items-center gap-2">
        <GripIcon aria-hidden className="size-3.5 shrink-0 text-white/35" />
        <img src={iconUrl} alt="" className="h-5 w-5 rounded-sm object-contain" />
        <span className="truncate text-[13px] font-semibold tracking-tight font-heading">
          Sulmag Dashboard
        </span>
        <span className="hidden text-[11px] text-white/40 sm:inline">— Metas Comercial</span>
      </div>
      <div className="app-region-no-drag flex h-full shrink-0 items-stretch">
        <button
          type="button"
          aria-label="Minimizar"
          onClick={() => void window.api?.minimize?.()}
          className="grid w-11 place-items-center text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <MinusIcon className="size-4" />
        </button>
        <button
          type="button"
          aria-label={maximized ? "Restaurar" : "Maximizar"}
          onClick={() => void window.api?.toggleMaximize?.()}
          className="grid w-11 place-items-center text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {maximized ? <CopyIcon className="size-3.5" /> : <SquareIcon className="size-3" />}
        </button>
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => void window.api?.closeWindow?.()}
          className="grid w-11 place-items-center text-white/70 transition-colors hover:bg-[#e81123] hover:text-white"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}