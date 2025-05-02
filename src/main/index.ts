import { type BrowserWindow, app } from 'electron'
import { makeAppWithSingleInstanceLock } from 'lib/electron-app/factories/app/instance'
import { makeAppSetup } from 'lib/electron-app/factories/app/setup'
import { registerHistoryIpcHandlers } from './ipc/history'
import { registerNotificationsIpcHandlers } from './ipc/notifications'
import { registerOpenAiIpcHandlers } from './ipc/openai'
import { registerSettingsIpcHandlers } from './ipc/settings'
import { registerSvnIpcHandlers } from './ipc/svn'
import { registerSystemIpcHandlers } from './ipc/system'
import { registerWindowIpcHandlers } from './ipc/window'
import { initAutoUpdater } from './updater'
import { MainWindow } from './windows/main'
import { initOverlayManager } from './windows/overlayStateManager'
import { setupAppFeatures } from './windows/tray'

export let mainWindow: BrowserWindow | null = null

makeAppWithSingleInstanceLock(async () => {
  await app.whenReady()

  // Register all IPC handlers
  registerWindowIpcHandlers()
  registerSettingsIpcHandlers()
  registerHistoryIpcHandlers()
  registerSvnIpcHandlers()
  registerOpenAiIpcHandlers()
  registerSystemIpcHandlers()
  registerNotificationsIpcHandlers()

  // Assign the created window to the exported variable
  mainWindow = await makeAppSetup(MainWindow)

  // Setup Tray, Startup
  if (mainWindow) {
    const tray = setupAppFeatures(mainWindow)
    initOverlayManager(mainWindow, tray)
    initAutoUpdater(mainWindow)
  }
})
