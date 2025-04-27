import { ipcMain } from 'electron'
import log from 'electron-log'
import { IPC } from 'main/constants'
import historyStore from 'main/store/HistoryStore'

export function registerHistoryIpcHandlers() {
  log.info('🔄 Registering History IPC Handlers...')

  ipcMain.handle(IPC.HISTORY.GET, () => historyStore.store)
  ipcMain.handle(IPC.HISTORY.SET, (_, data) => historyStore.set(data))

  log.info('✅ History IPC Handlers Registered')
}
