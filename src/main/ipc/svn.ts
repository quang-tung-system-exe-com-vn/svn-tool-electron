import { ipcMain } from 'electron'
import log from 'electron-log'
import { IPC } from 'main/constants'
import { blame } from 'main/svn/blame'
import { cat } from 'main/svn/cat'
import { changedFiles } from 'main/svn/changed-files'
import { cleanup } from 'main/svn/cleanup'
import { commit } from 'main/svn/commit'
import { getDiff } from 'main/svn/get-diff'
import { info } from 'main/svn/info'
import { type LogOptions, log as logSvn } from 'main/svn/log'
import { revert } from 'main/svn/revert'
import { type StatisticsOptions, getStatistics } from 'main/svn/statistics'
import { update } from 'main/svn/update'

export function registerSvnIpcHandlers() {
  log.info('🔄 Registering SVN IPC Handlers...')

  ipcMain.handle(IPC.SVN.CHANGED_FILES, async _event => await changedFiles())
  ipcMain.handle(IPC.SVN.GET_DIFF, async (_event, selectedFiles: any[]) => await getDiff(selectedFiles))
  ipcMain.handle(IPC.SVN.COMMIT, async (_event, commitMessage: string, violations: string, selectedFiles: any[]) => await commit(commitMessage, violations, selectedFiles))
  ipcMain.handle(IPC.SVN.INFO, async (_event, filePath: string) => await info(filePath))
  ipcMain.handle(IPC.SVN.CAT, async (_event, filePath: string) => await cat(filePath))
  ipcMain.handle(IPC.SVN.BLAME, async (_event, filePath: string) => await blame(filePath))
  ipcMain.handle(IPC.SVN.REVERT, async (_event, filePath: string | string[]) => await revert(filePath))
  ipcMain.handle(IPC.SVN.CLEANUP, async (_event, options?: string[]) => await cleanup(options))
  ipcMain.handle(IPC.SVN.LOG, async (_event, filePath: string | string[], options?: LogOptions) => await logSvn(filePath, options))
  ipcMain.handle(IPC.SVN.UPDATE, async (_event, filePath?: string | string[]) => await update(filePath))
  ipcMain.handle(IPC.SVN.STATISTICS, async (_event, filePath: string, options?: StatisticsOptions) => await getStatistics(filePath, options))

  log.info('✅ SVN IPC Handlers Registered')
}
