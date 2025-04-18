import { dialog } from 'electron'
import type { BrowserWindow } from 'electron'
import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

// Configure logging
log.transports.file.level = 'info'
autoUpdater.logger = log

// Set update check interval (in milliseconds)
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 24 // 24 hours

export interface UpdateInfo {
  updateAvailable: boolean
  version?: string
  releaseNotes?: string
}

/**
 * Initialize the auto updater
 * @param mainWindow The main application window
 */
export function initAutoUpdater(mainWindow: BrowserWindow) {
  // Configure auto updater events
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...')
    mainWindow.webContents.send('updater-status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info)
    mainWindow.webContents.send('updater-status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes
    })

    // Show dialog to user
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available!`,
      detail: 'Would you like to download and install it now?',
      buttons: ['Download', 'Later'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    log.info('No updates available:', info)
    mainWindow.webContents.send('updater-status', { status: 'not-available' })
  })

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err)
    mainWindow.webContents.send('updater-status', { status: 'error', error: err.message })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    const progress = Math.round(progressObj.percent)
    log.info(`Download progress: ${progress}%`)
    mainWindow.webContents.send('updater-status', {
      status: 'downloading',
      progress
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info)
    mainWindow.webContents.send('updater-status', { status: 'downloaded' })

    // Show dialog to user
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded',
      detail: 'The update has been downloaded. Restart the application to apply the updates.',
      buttons: ['Restart', 'Later'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall(false, true)
      }
    })
  })

  // Check for updates on startup
  setTimeout(() => {
    checkForUpdates()
  }, 3000) // Wait 3 seconds after app starts

  // Set up periodic update checks
  setInterval(() => {
    checkForUpdates()
  }, UPDATE_CHECK_INTERVAL)
}

/**
 * Check for updates
 * @returns Promise with update info
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  try {
    log.info('Manually checking for updates...')
    const updateCheckResult = await autoUpdater.checkForUpdates()

    if (updateCheckResult?.updateInfo) {
      const currentVersion = app.getVersion()
      const latestVersion = updateCheckResult.updateInfo.version

      // Compare versions
      const updateAvailable = latestVersion !== currentVersion

      return {
        updateAvailable,
        version: latestVersion,
        releaseNotes: typeof updateCheckResult.updateInfo.releaseNotes === 'string'
          ? updateCheckResult.updateInfo.releaseNotes
          : undefined
      }
    }

    return { updateAvailable: false }
  } catch (error) {
    log.error('Error checking for updates:', error)
    throw error
  }
}

/**
 * Download the latest update
 */
export function downloadUpdate() {
  autoUpdater.downloadUpdate()
}

/**
 * Install the downloaded update
 */
export function installUpdate() {
  autoUpdater.quitAndInstall(false, true)
}
