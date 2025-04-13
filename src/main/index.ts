import { app } from 'electron'
import { registerConfigIpcHandlers } from './ipc/config'

import { makeAppWithSingleInstanceLock } from 'lib/electron-app/factories/app/instance'
import { makeAppSetup } from 'lib/electron-app/factories/app/setup'
import { MainWindow } from './windows/main'

makeAppWithSingleInstanceLock(async () => {
  await app.whenReady()
  registerConfigIpcHandlers()
  await makeAppSetup(MainWindow)
})
