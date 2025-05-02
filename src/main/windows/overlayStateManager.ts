import { type BrowserWindow, type Tray, nativeImage } from 'electron'
import log from 'electron-log'
import { setOverlay as setActualOverlay } from '../utils/overlayHelper'
import { getResourcePath } from '../utils/utils'

let appUpdateAvailable = false
let newRevisionAvailable = false
let currentWindow: BrowserWindow | null = null
let currentTray: Tray | null = null
let defaultTrayIcon: Electron.NativeImage | null = null
let notificationTrayIcon: Electron.NativeImage | null = null

function _applyState(): void {
  _applyOverlay()
  _applyTrayIcon()
}

function _applyOverlay(): void {
  if (!currentWindow) {
    log.warn('[OverlayManager] Main window not available to apply overlay.')
    return
  }

  try {
    if (appUpdateAvailable) {
      log.info('[OverlayManager] Setting overlay: App Update Available')
      setActualOverlay(currentWindow, 'Update available', false)
    } else if (newRevisionAvailable) {
      log.info('[OverlayManager] Setting overlay: New Revision Available')
      setActualOverlay(currentWindow, 'New revision available', false)
    } else {
      log.info('[OverlayManager] Clearing overlay')
      setActualOverlay(currentWindow, '', true)
    }
  } catch (error) {
    log.error('[OverlayManager] Failed to apply overlay icon:', error)
  }
}

function _applyTrayIcon(): void {
  if (!currentTray) {
    log.warn('[OverlayManager] Tray not available to apply icon.')
    return
  }
  try {
    if ((appUpdateAvailable || newRevisionAvailable) && notificationTrayIcon) {
      log.info('[OverlayManager] Setting Tray icon: Notification')
      currentTray.setImage(notificationTrayIcon)
    } else if (defaultTrayIcon) {
      log.info('[OverlayManager] Setting Tray icon: Default')
      currentTray.setImage(defaultTrayIcon)
    } else {
      log.warn('[OverlayManager] Tray icons not loaded.')
    }
  } catch (error) {
    log.error('[OverlayManager] Failed to set Tray icon:', error)
  }
}

export function initOverlayManager(window: BrowserWindow | null, tray: Tray | null): void {
  if (!window && !tray) {
    log.error('[OverlayManager] Initialization failed: Both window and tray are null.')
    return
  }
  currentWindow = window
  currentTray = tray
  try {
    const defaultIconPath = getResourcePath('icon.ico')
    defaultTrayIcon = nativeImage.createFromPath(defaultIconPath).resize({ width: 16, height: 16 })
  } catch (error) {
    log.error('[OverlayManager] Failed to load default tray icon:', error)
  }
  try {
    const notificationIconPath = getResourcePath('icon-dot.png')
    notificationTrayIcon = nativeImage.createFromPath(notificationIconPath).resize({ width: 16, height: 16 })
  } catch (error) {
    log.error('[OverlayManager] Failed to load notification tray icon:', error)
  }
  log.info('[OverlayManager] Initialized.')
  _applyState()
}

export function updateAppStatus(available: boolean): void {
  if (appUpdateAvailable !== available) {
    log.info(`[OverlayManager] App update status changed: ${available}`)
    appUpdateAvailable = available
    _applyState()
  }
}

export function updateRevisionStatus(available: boolean): void {
  if (newRevisionAvailable !== available) {
    log.info(`[OverlayManager] Revision status changed: ${available}`)
    newRevisionAvailable = available
    _applyState()
  }
}

export function resetOverlayState(): void {
  log.info('[OverlayManager] Resetting overlay state.')
  appUpdateAvailable = false
  newRevisionAvailable = false
  _applyState()
}
