import { useRef } from "react";

import { useWindowMaximized } from "@/lib/useWindowMaximized";

type Handle = "n" | "e" | "s" | "w" | "ne" | "nw" | "se" | "sw";

const MIN_W = 960;
const MIN_H = 620;

const ZONES: { handle: Handle; className: string; cursor: string; corner?: string }[] = [
  { handle: "n", className: "left-[6px] right-[6px] top-0 h-[6px] hover:bg-muted-foreground/15", cursor: "cursor-ns-resize" },
  { handle: "s", className: "left-[6px] right-[6px] bottom-0 h-[6px] hover:bg-muted-foreground/15", cursor: "cursor-ns-resize" },
  { handle: "w", className: "top-[6px] bottom-[6px] left-0 w-[6px] hover:bg-muted-foreground/15", cursor: "cursor-ew-resize" },
  { handle: "e", className: "top-[6px] bottom-[6px] right-0 w-[6px] hover:bg-muted-foreground/15", cursor: "cursor-ew-resize" },
  {
    handle: "nw",
    className: "left-0 top-0 h-3.5 w-3.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground",
    cursor: "cursor-nwse-resize",
    corner: "border-l-2 border-t-2 border-current",
  },
  {
    handle: "ne",
    className: "right-0 top-0 h-3.5 w-3.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground",
    cursor: "cursor-nesw-resize",
    corner: "border-r-2 border-t-2 border-current",
  },
  {
    handle: "sw",
    className: "bottom-0 left-0 h-3.5 w-3.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground",
    cursor: "cursor-nesw-resize",
    corner: "border-b-2 border-l-2 border-current",
  },
  {
    handle: "se",
    className: "right-0 bottom-0 h-3.5 w-3.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground",
    cursor: "cursor-nwse-resize",
    corner: "border-b-2 border-r-2 border-current",
  },
];

interface DragState {
  handle: Handle;
  startX: number;
  startY: number;
  bounds: { x: number; y: number; width: number; height: number };
}

export default function WindowResizeHandles() {
  const maximized = useWindowMaximized();
  const drag = useRef<DragState | null>(null);
  const raf = useRef(0);
  const pending = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const flush = (): void => {
    raf.current = 0;
    const b = pending.current;
    pending.current = null;
    if (b) window.api?.setBounds(b);
  };

  const schedule = (b: { x: number; y: number; width: number; height: number }): void => {
    pending.current = b;
    if (!raf.current) raf.current = requestAnimationFrame(flush);
  };

  const onPointerDown =
    (handle: Handle) =>
    async (e: React.PointerEvent<HTMLDivElement>): Promise<void> => {
      if (maximized || !window.api?.getBounds) return;
      e.preventDefault();
      e.stopPropagation();
      const el = e.currentTarget;
      const bounds = await window.api.getBounds();
      el.setPointerCapture(e.pointerId);
      drag.current = { handle, startX: e.clientX, startY: e.clientY, bounds };
    };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const d = drag.current;
    if (!d) return;
    e.preventDefault();
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const { handle, bounds } = d;

    let { x, y, width, height } = bounds;
    if (handle.includes("e")) width = bounds.width + dx;
    if (handle.includes("w")) {
      width = bounds.width - dx;
      x = bounds.x + dx;
    }
    if (handle.includes("s")) height = bounds.height + dy;
    if (handle.includes("n")) {
      height = bounds.height - dy;
      y = bounds.y + dy;
    }
    if (width < MIN_W) {
      if (handle.includes("w")) x = bounds.x + bounds.width - MIN_W;
      width = MIN_W;
    }
    if (height < MIN_H) {
      if (handle.includes("n")) y = bounds.y + bounds.height - MIN_H;
      height = MIN_H;
    }
    schedule({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
  };

  const onPointerUp = (): void => {
    drag.current = null;
  };

  if (maximized) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      {ZONES.map(({ handle, className, cursor, corner }) => (
        <div
          key={handle}
          className={`pointer-events-auto absolute ${className} ${cursor} ${corner ?? ""}`}
          onPointerDown={onPointerDown(handle)}
        />
      ))}
    </div>
  );
}