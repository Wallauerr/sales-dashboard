import { MoonIcon, SunIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { THEME_STORAGE_KEY, type Theme } from '@/lib/theme'
import { applyDocumentTheme, readTheme } from '@/lib/theme-dom'

interface Props {
  className?: string
}

export function ThemeToggle({ className }: Props) {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    applyDocumentTheme(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {}
  }, [theme])

  const toggle = (): void => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label="Alternar tema"
      className={className}>
      {theme === 'dark' ? (
        <SunIcon className="size-4" />
      ) : (
        <MoonIcon className="size-4" />
      )}
    </Button>
  )
}
