import type { Category, Channel, ContentKind, Section } from '@shared/types'

export function sectionToKind(section: Section): ContentKind | null {
  switch (section) {
    case 'live':
      return 'live'
    case 'movies':
      return 'movie'
    case 'series':
      return 'series'
    default:
      return null
  }
}

/** Categorias do conjunto informado, ordenadas por quantidade de canais. */
export function categoriesOf(channels: Channel[]): Category[] {
  const map = new Map<string, number>()
  for (const ch of channels) {
    map.set(ch.group, (map.get(ch.group) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'))
}

/** Sigla de fallback para cards sem logo. */
export function initialsOf(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return 'TV'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
