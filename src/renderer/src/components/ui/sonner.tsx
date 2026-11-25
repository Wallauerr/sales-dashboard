import { type CSSProperties, useSyncExternalStore } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import {
  currentDocumentTheme,
  subscribeDocumentTheme,
} from '@/lib/theme-dom'

function Toaster(props: ToasterProps) {
  const theme = useSyncExternalStore(
    subscribeDocumentTheme,
    currentDocumentTheme,
    () => 'light' as const,
  )
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
