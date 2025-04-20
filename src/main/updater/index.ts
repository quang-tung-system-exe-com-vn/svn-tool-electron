import type { BrowserWindow } from 'electron'
import { app, ipcMain } from 'electron'
import log from 'electron-log'
import { autoUpdater } from 'electron-updater'
import { IPC } from '../constants'

log.transports.file.level = 'info'
autoUpdater.logger = log
autoUpdater.forceDevUpdateConfig = true
autoUpdater.autoDownload = true

export function initAutoUpdater(window: BrowserWindow) {
  autoUpdater.on('checking-for-update', () => {
    window.webContents.send(IPC.UPDATER.STATUS, { status: 'checking' })
  })

  autoUpdater.on('update-available', info => {
    window.webContents.send(IPC.UPDATER.STATUS, {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', info => {
    window.webContents.send(IPC.UPDATER.STATUS, { status: 'not-available' })
  })

  autoUpdater.on('error', err => {
    window.webContents.send(IPC.UPDATER.STATUS, { status: 'error', error: err.message })
  })

  autoUpdater.on('download-progress', progressObj => {
    window.webContents.send(IPC.UPDATER.STATUS, {
      status: 'downloading',
      progress: progressObj.percent,
    })
  })

  autoUpdater.on('update-downloaded', info => {
    window.webContents.send(IPC.UPDATER.STATUS, {
      status: 'downloaded',
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  ipcMain.handle(IPC.UPDATER.GET_VERSION, () => {
    return app.getVersion()
  })

  ipcMain.handle(IPC.UPDATER.CHECK_FOR_UPDATES, async () => {
    try {
      log.info('Manually checking for updates...')
      const updateCheckResult = await autoUpdater.checkForUpdates()
      if (updateCheckResult?.updateInfo) {
        const currentVersion = app.getVersion()
        const latestVersion = updateCheckResult.updateInfo.version
        const updateAvailable = latestVersion !== currentVersion
        let releaseNotes: string | undefined
        const rawNotes = updateCheckResult.updateInfo.releaseNotes
        if (typeof rawNotes === 'string') {
          releaseNotes = rawNotes
        } else if (Array.isArray(rawNotes)) {
          releaseNotes = rawNotes.map(r => r.note).join('\n\n')
        }
        return {
          status: updateAvailable ? 'available' : 'not-available',
          version: latestVersion,
          releaseNotes,
        }
      }
      return { status: 'not-available' }
    } catch (error) {
      log.error('Error checking for updates:', error)
      throw error
    }
  })

  ipcMain.handle(IPC.UPDATER.INSTALL_UPDATES, () => {
    autoUpdater.quitAndInstall(false, true)
  })
}
