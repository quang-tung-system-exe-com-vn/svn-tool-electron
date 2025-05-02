import type { BrowserWindow } from 'electron'
import { Notification, app, ipcMain } from 'electron'
import log from 'electron-log'
import { autoUpdater } from 'electron-updater'
import { IPC } from '../constants'
import configurationStore from '../store/ConfigurationStore'
import { updateAppStatus } from '../windows/overlayStateManager'

const currentVersion = app.getVersion()
log.transports.file.level = 'info'
autoUpdater.logger = log
autoUpdater.forceDevUpdateConfig = true
autoUpdater.autoDownload = true

export function initAutoUpdater(window: BrowserWindow) {
  const { showNotifications } = configurationStore.store
  autoUpdater.on('checking-for-update', () => {
    window.webContents.send(IPC.UPDATER.STATUS, { status: 'checking' })
  })

  autoUpdater.on('update-available', info => {
    log.info(`Update available: ${info.version}`)
    updateAppStatus(true)
    if (showNotifications && Notification.isSupported()) {
      const notification = new Notification({
        title: 'Update Available',
        body: `Version ${info.version} is available. It will be downloaded in the background.`,
      })
      notification.show()
    } else {
      log.warn('[Updater] Notifications not supported on this system.')
    }
    window.webContents.send(IPC.UPDATER.STATUS, {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
      currentVersion,
    })
  })

  autoUpdater.on('update-not-available', info => {
    updateAppStatus(false)
    window.webContents.send(IPC.UPDATER.STATUS, { status: 'not-available' })
  })

  autoUpdater.on('error', err => {
    updateAppStatus(false)
    window.webContents.send(IPC.UPDATER.STATUS, { status: 'error', error: err.message })
  })

  autoUpdater.on('download-progress', progressObj => {
    window.webContents.send(IPC.UPDATER.STATUS, {
      status: 'downloading',
      progress: progressObj.percent,
    })
  })

  autoUpdater.on('update-downloaded', info => {
    updateAppStatus(true)
    window.webContents.send(IPC.UPDATER.STATUS, {
      status: 'downloaded',
      version: info.version,
      releaseNotes: info.releaseNotes,
      currentVersion,
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
        const releaseNotes = updateCheckResult.updateInfo.releaseNotes
        const updateAvailable = latestVersion !== currentVersion
        await autoUpdater.checkForUpdates()
        return {
          status: updateAvailable ? 'available' : 'not-available',
          version: latestVersion,
          releaseNotes,
          currentVersion,
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
