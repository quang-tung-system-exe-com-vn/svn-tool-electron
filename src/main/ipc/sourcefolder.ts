import { ipcMain } from 'electron'
import log from 'electron-log'
import sourceFolderStore from '../store/SourceFolderStore'

export function registerSourceFolderIpcHandlers() {
  log.info('🔄 Registering Source Folder IPC Handlers...')

  ipcMain.handle('sourcefolder:get', async () => {
    return sourceFolderStore.get('sourceFolders')
  })

  ipcMain.handle('sourcefolder:set', async (_event, sourceFolders: { name: string; path: string }[]) => {
    sourceFolderStore.set('sourceFolders', sourceFolders)
  })

  log.info('✅ Source Folder IPC Handlers Registered')
}
