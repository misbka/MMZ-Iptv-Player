import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, MmzApi, Section } from '../shared/types'

/**
 * Ponte segura entre o Renderer e o Main.
 * O renderer nunca tem acesso a Node/Electron diretamente (contextIsolation).
 */
const api: MmzApi = {
  playlists: {
    list: () => ipcRenderer.invoke('playlist:list'),
    add: (name: string, source: string) => ipcRenderer.invoke('playlist:add', name, source),
    refresh: (id: string) => ipcRenderer.invoke('playlist:refresh', id),
    remove: (id: string) => ipcRenderer.invoke('playlist:remove', id),
    channels: (id: string) => ipcRenderer.invoke('playlist:channels', id)
  },
  epg: {
    load: (name: string, source: string) => ipcRenderer.invoke('epg:load', name, source),
    clear: () => ipcRenderer.invoke('epg:clear'),
    stats: () => ipcRenderer.invoke('epg:stats'),
    nowNext: (tvgIds: string[]) => ipcRenderer.invoke('epg:nowNext', tvgIds),
    schedule: (tvgId: string, from?: number) => ipcRenderer.invoke('epg:schedule', tvgId, from)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch: Partial<AppSettings>) => ipcRenderer.invoke('settings:set', patch)
  },
  dialog: {
    openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters)
  },
  app: {
    version: () => ipcRenderer.invoke('app:version')
  }
}

contextBridge.exposeInMainWorld('mmz', api)

// Compatibilidade: evita que o preload seja tratado como CommonJS puro sem exports
export type { Section }
