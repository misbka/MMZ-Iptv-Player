import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { gunzipSync, gzipSync } from 'zlib'
import { DEFAULT_SETTINGS } from '../../shared/types'
import type { AppSettings, Channel, EpgProgram, PlaylistMeta } from '../../shared/types'

/** Estrutura do arquivo de configuração persistido no userData. */
interface StoreFile {
  settings: AppSettings
  playlists: PlaylistMeta[]
  epg?: {
    sourceName?: string
    sourceUrl?: string
    updatedAt?: number
  }
}

export interface EpgData {
  /** tvg-id -> programas ordenados por início */
  programs: Record<string, EpgProgram[]>
  channels: Record<string, { name?: string; icon?: string }>
}

const dataDir = (): string => {
  const dir = join(app.getPath('userData'), 'mmz-data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

const storePath = (): string => join(dataDir(), 'store.json')
const playlistsDir = (): string => {
  const dir = join(dataDir(), 'playlists')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}
const epgPath = (): string => join(dataDir(), 'epg.json.gz')

let cache: StoreFile | null = null

function readStore(): StoreFile {
  if (cache) return cache
  try {
    if (existsSync(storePath())) {
      const raw = readFileSync(storePath(), 'utf-8')
      const parsed = JSON.parse(raw) as Partial<StoreFile>
      cache = {
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        playlists: parsed.playlists ?? [],
        epg: parsed.epg
      }
      return cache
    }
  } catch (err) {
    console.error('[storage] Falha ao ler store.json, usando padrões:', err)
  }
  cache = { settings: { ...DEFAULT_SETTINGS }, playlists: [] }
  return cache
}

function writeStore(data: StoreFile): void {
  cache = data
  try {
    writeFileSync(storePath(), JSON.stringify(data), 'utf-8')
  } catch (err) {
    console.error('[storage] Falha ao gravar store.json:', err)
  }
}

export function getSettings(): AppSettings {
  return readStore().settings
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const store = readStore()
  const next: AppSettings = { ...store.settings, ...patch }
  writeStore({ ...store, settings: next })
  return next
}

export function listPlaylists(): PlaylistMeta[] {
  return [...readStore().playlists].sort((a, b) => b.addedAt - a.addedAt)
}

export function savePlaylistMeta(meta: PlaylistMeta): void {
  const store = readStore()
  const idx = store.playlists.findIndex((p) => p.id === meta.id)
  if (idx >= 0) store.playlists[idx] = meta
  else store.playlists.push(meta)
  writeStore(store)
}

export function getPlaylistMeta(id: string): PlaylistMeta | undefined {
  return readStore().playlists.find((p) => p.id === id)
}

export function removePlaylist(id: string): void {
  const store = readStore()
  store.playlists = store.playlists.filter((p) => p.id !== id)
  writeStore(store)
  const file = join(playlistsDir(), `${id}.json`)
  if (existsSync(file)) {
    try {
      rmSync(file)
    } catch (err) {
      console.error('[storage] Falha ao remover cache da lista:', err)
    }
  }
}

export function saveChannels(playlistId: string, channels: Channel[]): void {
  try {
    writeFileSync(join(playlistsDir(), `${playlistId}.json`), JSON.stringify(channels), 'utf-8')
  } catch (err) {
    console.error('[storage] Falha ao gravar canais:', err)
  }
}

/** Cache local dos canais parseados — permite uso offline. */
export function loadChannels(playlistId: string): Channel[] {
  const file = join(playlistsDir(), `${playlistId}.json`)
  if (!existsSync(file)) return []
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as Channel[]
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('[storage] Falha ao ler canais:', err)
    return []
  }
}

export function loadAllChannels(): Channel[] {
  return listPlaylists().flatMap((p) => loadChannels(p.id))
}

export function saveEpgMeta(meta: NonNullable<StoreFile['epg']>): void {
  const store = readStore()
  writeStore({ ...store, epg: meta })
}

export function getEpgMeta(): NonNullable<StoreFile['epg']> | undefined {
  return readStore().epg
}

/** EPG persistido compactado em gzip (arquivos XMLTV podem ter dezenas de MB). */
export function saveEpg(data: EpgData): void {
  try {
    writeFileSync(epgPath(), gzipSync(Buffer.from(JSON.stringify(data), 'utf-8')))
  } catch (err) {
    console.error('[storage] Falha ao gravar EPG:', err)
  }
}

export function loadEpg(): EpgData | null {
  if (!existsSync(epgPath())) return null
  try {
    const json = gunzipSync(readFileSync(epgPath())).toString('utf-8')
    const parsed = JSON.parse(json) as EpgData
    return parsed && parsed.programs ? parsed : null
  } catch (err) {
    console.error('[storage] Falha ao ler EPG:', err)
    return null
  }
}

export function clearEpgFile(): void {
  if (existsSync(epgPath())) {
    try {
      rmSync(epgPath())
    } catch (err) {
      console.error('[storage] Falha ao limpar EPG:', err)
    }
  }
  const store = readStore()
  delete store.epg
  writeStore(store)
}
