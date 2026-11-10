export const LAST_VERSION_KEY = 'sd:last-version'

export type WhatsNewMode = 'welcome' | 'update'

export interface VersionStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function resolveWhatsNew(
  currentVersion: string,
  lastSeen: string | null,
  hasData = false,
): WhatsNewMode | null {
  if (!lastSeen) return hasData ? 'update' : 'welcome'
  if (lastSeen !== currentVersion) return 'update'
  return null
}

export function readLastVersion(storage: VersionStorage): string | null {
  try {
    return storage.getItem(LAST_VERSION_KEY)
  } catch {
    return null
  }
}

export function writeLastVersion(
  storage: VersionStorage,
  version: string,
): void {
  try {
    storage.setItem(LAST_VERSION_KEY, version)
  } catch {}
}
