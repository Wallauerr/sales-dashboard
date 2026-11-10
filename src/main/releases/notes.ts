import { net } from 'electron'
import {
  type GithubRelease,
  type ReleaseNote,
  releaseFromApi,
} from '../../shared/releases.ts'
import { REPO_NAME, REPO_OWNER } from '../../shared/repo.ts'

const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases?per_page=10`
const CACHE_TTL = 5 * 60 * 1000

let cache: { at: number; releases: ReleaseNote[] } | null = null

export async function listReleases(): Promise<ReleaseNote[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.releases

  const response = await net.fetch(API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Sulmag-Dashboard',
    },
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) {
    throw new Error(`GitHub respondeu ${response.status}`)
  }

  const raw = (await response.json()) as GithubRelease[]
  const releases = raw
    .filter(release => !release.draft && !release.prerelease)
    .map(releaseFromApi)
    .filter((release): release is ReleaseNote => release !== null)

  cache = { at: Date.now(), releases }
  return releases
}
