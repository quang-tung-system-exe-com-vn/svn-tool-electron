import { join } from 'node:path'
import { BrowserWindow } from 'electron'

import Store from 'electron-store'
import { createWindow } from 'lib/electron-app/factories/windows/create'
import { ENVIRONMENT } from 'shared/constants'
import { displayName } from '~/package.json'
const store = new Store()

import log from 'electron-log'
import { autoUpdater } from 'electron-updater'

autoUpdater.logger = log
log.transports.file.level = 'info'
log.info('App starting...')

export async function MainWindow() {
  const window = createWindow({
    id: 'main',
    title: displayName,
    frame: false,
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    show: false,
    center: true,
    movable: true,
    resizable: true,
    roundedCorners: true,
    // alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  window.webContents.on('did-finish-load', () => {
    if (ENVIRONMENT.IS_DEV) {
      window.webContents.openDevTools({ mode: 'detach' })
    }
    window.show()
  })

  window.on('close', () => {
    store.set('bounds', window.getBounds())
    for (const window of BrowserWindow.getAllWindows()) {
      window.destroy()
    }
  })

  window.setBounds(store.get('bounds') as Partial<Electron.Rectangle>)
  return window
}
