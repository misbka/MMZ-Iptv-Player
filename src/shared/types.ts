/**
 * Tipos compartilhados entre Main (Electron) e Renderer (React).
 * Este módulo é isomórfico: não pode importar nada de Node/Electron.
 */

import type { Language } from './i18n'
import { DEFAULT_LANGUAGE } from './i18n'

export type ContentKind = 'live' | 'movie' | 'series'

export type Section = 'home' | 'live' | 'movies' | 'series' | 'settings'

export interface Channel {
  /** hash estável da URL do stream */
  id: string
  name: string
  logo?: string
  group: string
  url: string
  tvgId?: string
  tvgName?: string
  kind: ContentKind
}

export interface Category {
  name: string
  count: number
}

export type PlaylistKind = 'remote' | 'local'

export interface PlaylistMeta {
  id: string
  name: string
  url: string
  channelCount: number
  addedAt: number
  updatedAt: number
  kind: PlaylistKind
}

export interface AddPlaylistResult {
  playlist: PlaylistMeta | null
  error?: string
}

export interface EpgProgram {
  start: number
  stop: number
  title: string
  description?: string
  category?: string
}

export interface NowNext {
  now?: EpgProgram
  next?: EpgProgram
}

export interface EpgStats {
  loaded: boolean
  channels: number
  programs: number
  sourceName?: string
  sourceUrl?: string
  updatedAt?: number
}

export interface AppSettings {
  volume: number
  muted: boolean
  lastSection: Section
  autoRefreshPlaylists: boolean
  epgRefreshMinutes: number
  featuredChannelId?: string
  /** Idioma da interface (pt | en | es). */
  language: Language
  /**
   * Quando true, as abas Filmes/Séries também exibem canais ao vivo
   * cujo grupo (group-title) indica VOD. Padrão false = separação estrita.
   */
  includeLinearVod: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  volume: 0.8,
  muted: false,
  lastSection: 'home',
  autoRefreshPlaylists: false,
  epgRefreshMinutes: 15,
  language: DEFAULT_LANGUAGE,
  includeLinearVod: false
}

/** Contrato exposto pelo preload via contextBridge (`window.mmz`). */
export interface MmzApi {
  playlists: {
    list(): Promise<PlaylistMeta[]>
    add(name: string, source: string): Promise<AddPlaylistResult>
    refresh(id: string): Promise<AddPlaylistResult>
    remove(id: string): Promise<void>
    channels(id: string): Promise<Channel[]>
  }
  epg: {
    load(name: string, source: string): Promise<{ ok: boolean; error?: string; channels?: number; programs?: number }>
    clear(): Promise<void>
    stats(): Promise<EpgStats>
    nowNext(tvgIds: string[]): Promise<Record<string, NowNext>>
    schedule(tvgId: string, from?: number): Promise<EpgProgram[]>
  }
  settings: {
    get(): Promise<AppSettings>
    set(patch: Partial<AppSettings>): Promise<AppSettings>
  }
  dialog: {
    openFile(filters: Array<{ name: string; extensions: string[] }>): Promise<string | null>
  }
  app: {
    version(): Promise<string>
  }
}
