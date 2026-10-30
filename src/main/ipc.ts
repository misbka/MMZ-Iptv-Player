import { app, dialog, ipcMain } from 'electron'
import { epgService } from './services/epg'
import * as playlist from './services/playlist'
import * as storage from './services/storage'
import type { AppSettings } from '../shared/types'

export function registerIpcHandlers(): void {
  // ---------- Playlists ----------
  ipcMain.handle('playlist:list', () => playlist.listPlaylists())

  ipcMain.handle('playlist:add', (_event, name: string, source: string) =>
    playlist.addPlaylist(name, source)
  )

  ipcMain.handle('playlist:refresh', (_event, id: string) => playlist.refreshPlaylist(id))

  ipcMain.handle('playlist:remove', (_event, id: string) => {
    playlist.removePlaylist(id)
  })

  ipcMain.handle('playlist:channels', (_event, id: string) => playlist.loadChannels(id))

  // ---------- EPG ----------
  ipcMain.handle('epg:load', (_event, name: string, source: string) => epgService.load(name, source))

  ipcMain.handle('epg:clear', () => epgService.clear())

  ipcMain.handle('epg:stats', () => epgService.stats())

  ipcMain.handle('epg:nowNext', (_event, ids: string[]) => epgService.nowNext(Array.isArray(ids) ? ids : []))

  ipcMain.handle('epg:schedule', (_event, tvgId: string, from?: number) =>
    epgService.schedule(tvgId, typeof from === 'number' ? from : Date.now())
  )

  // ---------- Configurações ----------
  ipcMain.handle('settings:get', () => storage.getSettings())

  ipcMain.handle('settings:set', (_event, patch: Partial<AppSettings>) => storage.setSettings(patch ?? {}))

  // ---------- Diálogos / App ----------
  ipcMain.handle(
    'dialog:openFile',
    async (_event, filters: Array<{ name: string; extensions: string[] }>) => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: filters ?? [{ name: 'Todos os arquivos', extensions: ['*'] }]
      })
      return result.canceled ? null : (result.filePaths[0] ?? null)
    }
  )

  ipcMain.handle('app:version', () => app.getVersion())
}
