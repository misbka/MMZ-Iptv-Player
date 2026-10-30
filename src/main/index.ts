import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { epgService } from './services/epg'

// Modo portátil: permite direcionar os dados (cache de listas/EPG) via variável de ambiente
const portableDir = process.env['MMZ_USER_DATA_DIR']
if (portableDir) {
  app.setPath('userData', portableDir)
}

// Evita múltiplas instâncias (importante para apps de TV/mediacentro)
const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  const createWindow = (): void => {
    mainWindow = new BrowserWindow({
      width: 1480,
      height: 880,
      minWidth: 1024,
      minHeight: 620,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: '#0b0b0d',
      title: 'MMZ IPTV PLAYER',
      icon: join(app.getAppPath(), 'build', 'icon.png'),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true,
        spellcheck: false
      }
    })

    Menu.setApplicationMenu(null)

    mainWindow.on('ready-to-show', () => {
      mainWindow?.show()
      if (!mainWindow) return
      // Maximiza em telas grandes (experiência TV)
      const { width } = mainWindow.getBounds()
      if (width < 1600) mainWindow.maximize()
    })

    // Links externos sempre abrem no navegador padrão do sistema
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith(process.env['ELECTRON_RENDERER_URL'] ?? 'http://localhost')) {
        event.preventDefault()
      }
    })

    if (process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    registerIpcHandlers()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('before-quit', () => {
    epgService.persist()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
