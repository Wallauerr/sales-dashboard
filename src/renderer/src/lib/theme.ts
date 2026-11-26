export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'theme'

export interface ThemeRoot {
  classList: {
    contains: (name: string) => boolean
    toggle: (name: string, force: boolean) => void
  }
  style: { colorScheme: string }
}

export function resolveTheme(
  stored: string | null,
  prefersDark: boolean,
): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return prefersDark ? 'dark' : 'light'
}

export function documentTheme(root: ThemeRoot): Theme {
  return root.classList.contains('dark') ? 'dark' : 'light'
}

export function applyTheme(theme: Theme, root: ThemeRoot): void {
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}
