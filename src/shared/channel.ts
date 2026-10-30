import type { Channel, ContentKind } from './types'

/** Grupos que indicam conteúdo sob demanda (filmes). */
const MOVIE_RE =
  /\b(movies?|films?|filmes?|vodd?|vod|cinema|à\s*demand[ae]?|a\s*demand[ae]?|video\s*on\s*demand|box\s*office|programas?\s*completos?)\b/i

/** Grupos que indicam séries. */
const SERIES_RE = /\b(series|s[eé]ries|seasons?|temporadas?|episodes?|novelas?)\b/i

/**
 * Arquivos de VOD de verdade (vídeo completo). NÃO inclui `.ts`: segmentos HLS
 * ao vivo costumam terminar em .ts e jamais devem aparecer em Filmes/Séries.
 */
const VOD_FILE_RE = /\.(mp4|mkv|avi|mov|m4v|flv|wmv|webm|mpg|mpeg|3gp)(\?|$)/i

/**
 * Sinais de stream linear (ao vivo): playlists HLS/DASH, segmentos .ts,
 * caminhos /live/ e parâmetros clássicos de servidores Xtream/Portal.
 */
const LIVE_SIGNAL_RE =
  /(\.m3u8|\.m3u|\.ts|\.aac|\.m4s|\.mpd)(\?|$)|\/live(\/|:)|livetv|chunklist|\/(master|index|playlist)\.m3u8?|\bsmil\b|mpegts|[?&](type|format)=m3u8/i

/** Caminhos que indicam VOD mesmo sem extensão de arquivo (URLs REST). */
const VOD_PATH_RE = /\/(movies?|films?|filmes?|series|s[eé]ries|vod|cinema)\//i

/** Último segmento do caminho (sem query/fragment). */
function lastSegment(url: string): string {
  const clean = url.split(/[?#]/)[0]
  const parts = clean.split('/').filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1] : ''
}

/** True quando o último segmento termina em extensão (ex.: get.php, filme.mp4). */
function hasExtension(segment: string): boolean {
  return /\.[a-z0-9]{1,8}$/i.test(segment)
}

/**
 * Classificação do GRUPO (group-title): 'movie' | 'series' | null.
 * Usado como sinal secundário e pela preferência "includeLinearVod".
 */
export function groupKind(group: string): ContentKind | null {
  const g = (group || '').toLowerCase()
  if (SERIES_RE.test(g)) return 'series'
  if (MOVIE_RE.test(g)) return 'movie'
  return null
}

/**
 * Detecta o tipo de conteúdo a partir do grupo da lista M3U e da URL do stream.
 *
 * Estratégia estrita (ordem importa):
 *  1. arquivo de vídeo completo (mp4/mkv/…) => VOD (série se o grupo indicar);
 *  2. sinais de stream ao vivo (m3u8, /live/, .ts, …) => ao vivo, mesmo que o
 *     grupo se chame "Filmes e Séries" (canais lineares de nicho);
 *  3. URL sem extensão e sem caminho de VOD => ao vivo (endpoints de stream);
 *  4. caso contrário, decide pelo grupo.
 *
 * Listas que guardam VOD em streams HLS podem ser contempladas pela
 * preferência `includeLinearVod` (exibição), sem alterar o parse.
 */
export function detectKind(group: string, url: string): ContentKind {
  const u = (url || '').trim()
  if (VOD_FILE_RE.test(u)) return groupKind(group) === 'series' ? 'series' : 'movie'
  if (LIVE_SIGNAL_RE.test(u)) return 'live'

  const segment = lastSegment(u)
  if (!hasExtension(segment) && !VOD_PATH_RE.test(u)) return 'live'

  return groupKind(group) ?? 'live'
}

/** Hash djb2 (hex) simples, estável e rápido para gerar ids de canal. */
export function hashId(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0
  }
  // unsigned + second pass para reduzir colisões
  let hash2 = 52711
  for (let i = input.length - 1; i >= 0; i--) {
    hash2 = ((hash2 << 5) + hash2 + input.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(36) + (hash2 >>> 0).toString(36)
}

/** Remove canais duplicados (mesma URL) preservando a primeira ocorrência. */
export function dedupeChannels(channels: Channel[]): Channel[] {
  const seen = new Set<string>()
  const out: Channel[] = []
  for (const ch of channels) {
    const key = ch.url.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(ch)
  }
  return out
}

/** Nome de categoria padrão quando o grupo vem vazio. */
export const DEFAULT_CATEGORY = 'Geral'

/** Normaliza o group-title, tolerando valores ausentes ou malformados. */
export function normalizeGroup(group: unknown): string {
  const g = typeof group === 'string' ? group.trim() : ''
  return g.length > 0 ? g : DEFAULT_CATEGORY
}
