import { useEffect, useState } from "react";

export function useWindowMaximized(): boolean {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const off = window.api?.onMaximized?.((v) => setMaximized(v));
    return off;
  }, []);

  return maximized;
}