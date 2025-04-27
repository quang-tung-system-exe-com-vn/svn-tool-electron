import { app } from 'electron'
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

  const mainWindow = await makeAppSetup(MainWindow)
  initAutoUpdater(mainWindow)
})
