import { create } from 'zustand'
import type {
  AddPlaylistResult,
  AppSettings,
  Channel,
  EpgStats,
  NowNext,
  PlaylistMeta,
  Section
} from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { setRuntimeLanguage } from '@shared/i18n'
import { translateNow } from '../hooks/useT'

export type FocusArea = 'sidebar' | 'content'
export type ContentFocus = 'filters' | 'grid'

interface PlayerSlice {
  isOpen: boolean
  channelId: string | null
  showInfo: boolean
  showGuide: boolean
}

interface Toast {
  id: number
  message: string
  type: 'info' | 'error'
}

interface StoreState {
  booted: boolean
  section: Section
  focusArea: FocusArea
  contentFocus: ContentFocus

  playlists: PlaylistMeta[]
  channels: Channel[]
  activeCategory: string
  search: string

  epg: Record<string, NowNext>
  epgStats: EpgStats | null
  epgVisibleIds: string[]

  settings: AppSettings
  version: string

  player: PlayerSlice
  toast: Toast | null

  // ---- actions ----
  boot(): Promise<void>
  setSection(section: Section): void
  /** Seleciona a seção sem mover o foco (usado pela navegação do menu lateral). */
  selectSection(section: Section): void
  setFocusArea(area: FocusArea): void
  setContentFocus(area: ContentFocus): void
  setActiveCategory(category: string): void
  setSearch(query: string): void
  setEpgVisibleIds(ids: string[]): void
  mergeEpg(batch: Record<string, NowNext>): void
  refreshAllChannels(): Promise<void>
  addPlaylist(name: string, source: string): Promise<string | null>
  removePlaylist(id: string): Promise<void>
  refreshPlaylist(id: string): Promise<string | null>
  loadEpg(name: string, source: string): Promise<string | null>
  clearEpg(): Promise<void>
  updateSettings(patch: Partial<AppSettings>): Promise<void>
  play(channelId: string): void
  closePlayer(): void
  toggleInfo(force?: boolean): void
  toggleGuide(force?: boolean): void
  showToast(message: string, type?: Toast['type']): void
}

let toastCounter = 0

export const useStore = create<StoreState>((set, get) => ({
  booted: false,
  section: 'home',
  focusArea: 'content',
  contentFocus: 'grid',

  playlists: [],
  channels: [],
  activeCategory: 'Todos',
  search: '',

  epg: {},
  epgStats: null,
  epgVisibleIds: [],

  settings: { ...DEFAULT_SETTINGS },
  version: '1.0.0',

  player: { isOpen: false, channelId: null, showInfo: false, showGuide: false },
  toast: null,

  async boot() {
    try {
      const mmz = window.mmz
      const [settings, playlists, version] = await Promise.all([
        mmz.settings.get(),
        mmz.playlists.list(),
        mmz.app.version()
      ])

      set({
        settings,
        playlists,
        version,
        section: settings.lastSection ?? 'home',
        focusArea: 'content'
      })
      setRuntimeLanguage(settings.language)

      // Carrega o cache local dos canais (funciona offline após o 1º carregamento)
      const channels: Channel[] = []
      for (const playlist of playlists) {
        const list = await mmz.playlists.channels(playlist.id)
        channels.push(...list)
      }
      set({ channels })

      const epgStats = await mmz.epg.stats()
      set({ epgStats })

      if (epgStats.loaded && channels.length > 0) {
        const batch = await mmz.epg.nowNext(
          channels.slice(0, 300).flatMap((c) => (c.tvgId ? [c.tvgId] : []))
        )
        set((s) => ({ epg: { ...s.epg, ...batch } }))
      }

      if (settings.autoRefreshPlaylists && playlists.length > 0) {
        // Atualização silenciosa em segundo plano
        void get().refreshAllChannels()
      }
    } catch (err) {
      // Nunca deixa a tela de carregamento presa: segue com o cache vazio
      console.error('[store] boot:', err)
    } finally {
      set({ booted: true })
    }
  },

  setSection(section) {
    set({
      section,
      focusArea: 'content',
      contentFocus: section === 'home' ? 'grid' : 'filters',
      search: '',
      activeCategory: 'Todos'
    })
    void window.mmz.settings.set({ lastSection: section })
  },

  selectSection(section) {
    set({ section, search: '', activeCategory: 'Todos' })
    void window.mmz.settings.set({ lastSection: section })
  },

  setFocusArea(focusArea) {
    set({ focusArea })
  },

  setContentFocus(contentFocus) {
    set({ contentFocus })
  },

  setActiveCategory(activeCategory) {
    set({ activeCategory, contentFocus: 'grid' })
  },

  setSearch(search) {
    set({ search })
  },

  setEpgVisibleIds(ids) {
    const current = get().epgVisibleIds
    if (current.length === ids.length && current.every((v, i) => v === ids[i])) return
    set({ epgVisibleIds: ids })
  },

  mergeEpg(batch) {
    set((s) => ({ epg: { ...s.epg, ...batch } }))
  },

  async refreshAllChannels() {
    try {
      const mmz = window.mmz
      const playlists = await mmz.playlists.list()
      const channels: Channel[] = []
      for (const playlist of playlists) {
        channels.push(...(await mmz.playlists.channels(playlist.id)))
      }
      set({ playlists, channels })
    } catch (err) {
      console.error('[store] refreshAllChannels:', err)
    }
  },

  async addPlaylist(name, source) {
    try {
      const result: AddPlaylistResult = await window.mmz.playlists.add(name, source)
      if (result.error || !result.playlist) {
        return result.error ?? translateNow('toast.addFailed')
      }
      await get().refreshAllChannels()
      get().showToast(
        translateNow('toast.playlistAdded', {
          name: result.playlist.name,
          count: result.playlist.channelCount
        })
      )
      return null
    } catch (err) {
      console.error('[store] addPlaylist:', err)
      return (err as Error)?.message || translateNow('toast.addFailed')
    }
  },

  async removePlaylist(id) {
    try {
      await window.mmz.playlists.remove(id)
      await get().refreshAllChannels()
      get().showToast(translateNow('toast.playlistRemoved'))
    } catch (err) {
      console.error('[store] removePlaylist:', err)
      get().showToast((err as Error)?.message || translateNow('toast.addFailed'), 'error')
    }
  },

  async refreshPlaylist(id) {
    try {
      const result = await window.mmz.playlists.refresh(id)
      await get().refreshAllChannels()
      if (result.error) return result.error
      if (result.playlist) {
        get().showToast(
          translateNow('toast.playlistUpdated', {
            name: result.playlist.name,
            count: result.playlist.channelCount
          })
        )
      }
      return null
    } catch (err) {
      console.error('[store] refreshPlaylist:', err)
      return (err as Error)?.message || translateNow('toast.addFailed')
    }
  },

  async loadEpg(name, source) {
    try {
      const result = await window.mmz.epg.load(name, source)
      if (!result.ok) return result.error ?? translateNow('toast.epgFailed')
      const stats = await window.mmz.epg.stats()
      set({ epgStats: stats, epg: {} })
      get().showToast(
        translateNow('toast.epgLoaded', {
          channels: result.channels ?? 0,
          programs: result.programs ?? 0
        })
      )
      return null
    } catch (err) {
      console.error('[store] loadEpg:', err)
      return (err as Error)?.message || translateNow('toast.epgFailed')
    }
  },

  async clearEpg() {
    try {
      await window.mmz.epg.clear()
      set({ epgStats: null, epg: {} })
      get().showToast(translateNow('toast.epgCleared'))
    } catch (err) {
      console.error('[store] clearEpg:', err)
      get().showToast((err as Error)?.message || translateNow('toast.epgFailed'), 'error')
    }
  },

  async updateSettings(patch) {
    const settings = await window.mmz.settings.set(patch)
    set({ settings })
    setRuntimeLanguage(settings.language)
  },

  play(channelId) {
    set({
      player: { isOpen: true, channelId, showInfo: true, showGuide: false },
      focusArea: 'content'
    })
  },

  closePlayer() {
    set((s) => ({ player: { ...s.player, isOpen: false, showGuide: false } }))
  },

  toggleInfo(force) {
    set((s) => ({ player: { ...s.player, showInfo: force ?? !s.player.showInfo } }))
  },

  toggleGuide(force) {
    set((s) => ({ player: { ...s.player, showGuide: force ?? !s.player.showGuide } }))
  },

  showToast(message, type = 'info') {
    const id = ++toastCounter
    set({ toast: { id, message, type } })
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null })
    }, 4500)
  }
}))
