import { ipcMain } from 'electron'
import log from 'electron-log'
import { IPC } from 'main/constants'
import codingRuleStore from '../store/CodingRuleStore'

export function registerCodingRuleIpcHandlers() {
  log.info('🔄 Registering CodingRule IPC Handlers...')

  ipcMain.handle(IPC.SETTING.CODING_RULE.GET, () => codingRuleStore.store)
  ipcMain.handle(IPC.SETTING.CODING_RULE.SET, (_, config) => codingRuleStore.set(config))

  log.info('✅ CodingRule IPC Handlers Registered')
}
