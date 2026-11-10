import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '@/lib/errors'
import type { ReleaseNote } from '../../../shared/releases'

const CACHE_KEY = 'sd:release-notes'

function readCache(): ReleaseNote[] {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ReleaseNote[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCache(releases: ReleaseNote[]): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(releases))
  } catch {}
}

export interface ReleasesState {
  releases: ReleaseNote[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useReleases(): ReleasesState {
  const [releases, setReleases] = useState<ReleaseNote[]>(readCache)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    if (!window.api) return
    setLoading(true)
    try {
      const list = await window.api.listReleases()
      setReleases(list)
      writeCache(list)
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { releases, loading, error, refresh: () => void load() }
}
