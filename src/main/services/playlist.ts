import { randomUUID } from 'crypto'
import { parse as parseM3u } from 'iptv-playlist-parser'
import { dedupeChannels, detectKind, hashId, normalizeGroup } from '../../shared/channel'
import type { AddPlaylistResult, Channel, PlaylistMeta } from '../../shared/types'
import * as storage from './storage'
import { isLocalSource, readSource } from './source'
import { t } from './i18n'

/** Parser de fallback (tolerante a listas malformadas) caso a biblioteca falhe. */
function manualParse(content: string): Channel[] {
  const lines = content.split(/\r?\n/)
  const out: Channel[] = []
  let pending: { attrs: Record<string, string>; name: string } | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('#EXTINF')) {
      const attrs: Record<string, string> = {}
      const attrRe = /([a-zA-Z0-9-_]+)="([^"]*)"/g
      let m: RegExpExecArray | null
      while ((m = attrRe.exec(line)) !== null) {
        attrs[m[1].toLowerCase()] = m[2]
      }
      const commaIdx = line.lastIndexOf(',')
      const name = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : t('parser.noName')
      pending = { attrs, name }
    } else if (line.startsWith('#')) {
      continue
    } else if (pending) {
      out.push(buildChannel(pending.name, pending.attrs, line))
      pending = null
    }
  }
  return out
}

function buildChannel(
  name: string,
  attrs: Record<string, string>,
  url: string
): Channel {
  const group = normalizeGroup(attrs['group-title'])
  return {
    id: hashId(url.trim().toLowerCase()),
    name: name || attrs['tvg-name'] || t('parser.noName'),
    logo: attrs['tvg-logo'] || undefined,
    group,
    url: url.trim(),
    tvgId: attrs['tvg-id'] || undefined,
    tvgName: attrs['tvg-name'] || undefined,
    kind: detectKind(group, url)
  }
}

/** Converte o conteúdo M3U em canais normalizados, com dedupe e detecção de tipo. */
export function parsePlaylistContent(content: string): Channel[] {
  let channels: Channel[] = []

  try {
    const parsed = parseM3u(content)
    channels = (parsed.items ?? [])
      .filter((item) => typeof item.url === 'string' && item.url.length > 0)
      .map((item) =>
        buildChannel(
          item.name || item.tvg?.name || t('parser.noName'),
          {
            'group-title': item.group?.title ?? '',
            'tvg-id': item.tvg?.id ?? '',
            'tvg-name': item.tvg?.name ?? '',
            'tvg-logo': item.tvg?.logo ?? ''
          },
          item.url
        )
      )
  } catch (err) {
    console.warn('[playlist] Biblioteca falhou no parse, usando parser manual:', err)
  }

  if (channels.length === 0) {
    channels = manualParse(content)
  }

  return dedupeChannels(channels)
}

/**
 * Diagnóstico amigável quando o parse não encontra canais:
 * distingue HTML/página errada de uma M3U realmente vazia.
 */
function emptyReason(content: string): string {
  const trimmed = content.trimStart()
  const hasM3u = /#EXTM3U|#EXTINF/i.test(content)
  if (!hasM3u) {
    const preview = (trimmed.slice(0, 30) || '—').replace(/\s+/g, ' ')
    return t('err.notM3u', { preview })
  }
  return t('err.noChannels')
}

export async function addPlaylist(name: string, source: string): Promise<AddPlaylistResult> {
  let content: string
  try {
    content = await readSource(source)
  } catch (err) {
    return { playlist: null, error: (err as Error).message }
  }

  const channels = parsePlaylistContent(content)
  if (channels.length === 0) {
    return { playlist: null, error: emptyReason(content) }
  }

  const now = Date.now()
  const meta: PlaylistMeta = {
    id: randomUUID(),
    name: (name || '').trim() || 'Minha lista',
    url: source.trim(),
    channelCount: channels.length,
    addedAt: now,
    updatedAt: now,
    kind: isLocalSource(source) ? 'local' : 'remote'
  }

  storage.saveChannels(meta.id, channels)
  storage.savePlaylistMeta(meta)
  return { playlist: meta }
}

export async function refreshPlaylist(id: string): Promise<AddPlaylistResult> {
  const meta = storage.getPlaylistMeta(id)
  if (!meta) return { playlist: null, error: t('err.playlistNotFound') }

  let content: string
  try {
    content = await readSource(meta.url)
  } catch (err) {
    // Mantém o cache antigo em caso de falha de rede (modo offline)
    return { playlist: meta, error: (err as Error).message }
  }

  const channels = parsePlaylistContent(content)
  if (channels.length === 0) {
    return { playlist: meta, error: t('err.refreshNoChannels') }
  }

  const updated: PlaylistMeta = {
    ...meta,
    channelCount: channels.length,
    updatedAt: Date.now()
  }
  storage.saveChannels(id, channels)
  storage.savePlaylistMeta(updated)
  return { playlist: updated }
}

export function removePlaylist(id: string): void {
  storage.removePlaylist(id)
}

export function listPlaylists(): PlaylistMeta[] {
  return storage.listPlaylists()
}

export function loadChannels(id: string): Channel[] {
  return storage.loadChannels(id)
}
