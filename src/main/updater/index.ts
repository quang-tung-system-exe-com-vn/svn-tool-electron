import type { BrowserWindow } from 'electron'
import { app, ipcMain } from 'electron'
import log from 'electron-log'
import { autoUpdater } from 'electron-updater'
import { IPC } from '../constants'

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

  autoUpdater.on('update-available', info => {
    log.info('Update available:', info)
    mainWindow.webContents.send('updater-status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
    })

    // Show dialog using Shadcn UI in renderer process
    mainWindow.webContents.send(IPC.UPDATER.SHOW_DIALOG, {
      type: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', info => {
    log.info('No updates available:', info)
    mainWindow.webContents.send('updater-status', { status: 'not-available' })
  })

  autoUpdater.on('error', err => {
    log.error('Error in auto-updater:', err)
    mainWindow.webContents.send('updater-status', { status: 'error', error: err.message })
  })

  autoUpdater.on('download-progress', progressObj => {
    const progress = Math.round(progressObj.percent)
    log.info(`Download progress: ${progress}%`)
    mainWindow.webContents.send('updater-status', {
      status: 'downloading',
      progress,
    })
  })

  autoUpdater.on('update-downloaded', info => {
    log.info('Update downloaded:', info)
    mainWindow.webContents.send('updater-status', { status: 'downloaded' })

    // Show dialog using Shadcn UI in renderer process
    mainWindow.webContents.send(IPC.UPDATER.SHOW_DIALOG, {
      type: 'downloaded',
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  // Listen for dialog responses from renderer
  ipcMain.on(IPC.UPDATER.DIALOG_RESPONSE, (_event, { type, action }) => {
    if (type === 'available' && action === 'accept') {
      autoUpdater.downloadUpdate()
    } else if (type === 'downloaded' && action === 'accept') {
      autoUpdater.quitAndInstall(false, true)
    }
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
        releaseNotes: typeof updateCheckResult.updateInfo.releaseNotes === 'string' ? updateCheckResult.updateInfo.releaseNotes : undefined,
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
