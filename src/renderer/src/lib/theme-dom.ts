import {
  applyTheme,
  documentTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from './theme'

export function readTheme(): Theme {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(THEME_STORAGE_KEY)
  } catch {}
  return resolveTheme(
    stored,
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )
}

export function currentDocumentTheme(): Theme {
  return documentTheme(document.documentElement)
}

export function applyDocumentTheme(theme: Theme): void {
  applyTheme(theme, document.documentElement)
}

export function subscribeDocumentTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  return () => observer.disconnect()
}
