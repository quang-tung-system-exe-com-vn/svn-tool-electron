import { type BrowserWindow, nativeImage } from 'electron'
import log from 'electron-log'
import { getResourcePath } from './utils'

let overlayIcon: Electron.NativeImage | null = null
const overlayIconPath = getResourcePath('dot.png')
try {
  overlayIcon = nativeImage.createFromPath(overlayIconPath).resize({ width: 20, height: 20 })
} catch (error) {
  log.warn('[Updater] Could not load overlay icon:', overlayIconPath, error)
}

/**
 * Sets or clears the overlay icon on the main window's taskbar icon (Windows only).
 * @param window The main BrowserWindow instance.
 * @param icon The NativeImage to use as overlay, or null to clear.
 * @param description Accessibility description for the overlay.
 */
export function setOverlay(window: BrowserWindow | null, description: string, clear?: boolean): void {
  if (!window) {
    log.warn('[OverlayHelper] Attempted to set overlay on a null window.')
    return
  }
  if (process.platform === 'win32') {
    try {
      if (clear) {
        window.setOverlayIcon(null, '')
      } else {
        window.setOverlayIcon(overlayIcon, description)
      }
      log.info(`[OverlayHelper] Overlay set: ${description || 'cleared'}`)
    } catch (error) {
      log.error('[OverlayHelper] Failed to set overlay icon:', error)
    }
  } else {
    log.debug('[OverlayHelper] Overlay icons not supported on this platform.')
  }
}
