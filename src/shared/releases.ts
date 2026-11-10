export interface ReleaseNote {
  version: string
  date: string
  highlights: string[]
  improvements?: string[]
  fixes?: string[]
  removed?: string[]
}

export const RELEASE_SECTIONS = [
  { key: 'highlights', title: 'Novidades' },
  { key: 'improvements', title: 'Melhorias' },
  { key: 'fixes', title: 'Correções' },
  { key: 'removed', title: 'Removido' },
] as const

export type ReleaseSectionKey = (typeof RELEASE_SECTIONS)[number]['key']

const SECTION_ALIASES: Record<string, ReleaseSectionKey> = {
  novidades: 'highlights',
  novidade: 'highlights',
  novo: 'highlights',
  highlights: 'highlights',
  'whats new': 'highlights',
  melhorias: 'improvements',
  melhoria: 'improvements',
  improvements: 'improvements',
  correcoes: 'fixes',
  correcao: 'fixes',
  fixes: 'fixes',
  bugs: 'fixes',
  removido: 'removed',
  removidos: 'removed',
  removed: 'removed',
}

export interface GithubRelease {
  tag_name: string
  body?: string | null
  draft?: boolean
  prerelease?: boolean
  published_at?: string | null
}

function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/(^|[^_])_([^_]+)_/g, '$1$2')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseReleaseBody(
  body: string,
): Pick<ReleaseNote, ReleaseSectionKey> {
  const sections: Record<ReleaseSectionKey, string[]> = {
    highlights: [],
    improvements: [],
    fixes: [],
    removed: [],
  }
  let current: ReleaseSectionKey = 'highlights'

  for (const rawLine of body.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*$/)
    if (heading) {
      const key = SECTION_ALIASES[normalizeTitle(heading[1])]
      if (key) current = key
      continue
    }

    const bullet = line.match(/^[-*+]\s+(.+)$/)
    const item = stripInlineMarkdown(bullet ? bullet[1] : line)
    if (item) sections[current].push(item)
  }

  return {
    highlights: sections.highlights,
    improvements:
      sections.improvements.length > 0 ? sections.improvements : undefined,
    fixes: sections.fixes.length > 0 ? sections.fixes : undefined,
    removed: sections.removed.length > 0 ? sections.removed : undefined,
  }
}

export function releaseFromApi(raw: GithubRelease): ReleaseNote | null {
  const version = raw.tag_name.replace(/^v/i, '').trim()
  if (!version) return null
  return {
    version,
    date: raw.published_at ? raw.published_at.slice(0, 10) : '',
    ...parseReleaseBody(raw.body ?? ''),
  }
}

export function formatReleaseDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

export function recentReleases(
  releases: ReleaseNote[],
  limit = 3,
): ReleaseNote[] {
  return releases.slice(0, limit)
}
