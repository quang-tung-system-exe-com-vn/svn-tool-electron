import { dialog, ipcMain, shell } from 'electron'
import log from 'electron-log'
import { IPC } from 'main/constants'
import fs from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import configurationStore from '../store/ConfigurationStore'

export function registerSystemIpcHandlers() {
  log.info('🔄 Registering System IPC Handlers...')

  ipcMain.handle(IPC.SYSTEM.OPEN_FOLDER, async () => {
    log.info('Opening folder dialog...')
    const { sourceFolder: defaultPath } = configurationStore.store
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: defaultPath || undefined,
    })
    if (result.canceled || result.filePaths.length === 0) {
      log.info('Folder selection cancelled.')
      return ''
    }
    const selectedPath = result.filePaths[0]
    log.info(`Folder selected: ${selectedPath}`)
    return selectedPath
  })

  ipcMain.handle(IPC.SYSTEM.REVEAL_IN_FILE_EXPLORER, async (_event, filePath: string) => {
    if (!filePath) {
      log.warn('Reveal in Explorer: No file path provided.')
      return
    }
    const { sourceFolder } = configurationStore.store
    const absolutePath = sourceFolder ? path.resolve(sourceFolder, filePath) : path.resolve(filePath)
    log.info(`Revealing item in file explorer: ${absolutePath}`)
    shell.showItemInFolder(absolutePath)
  })

  ipcMain.handle(IPC.SYSTEM.READ_FILE, async (_event, filePath: string) => {
    log.info(`Attempting to read file: ${filePath}`)
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid filePath provided for reading.')
      }
      const { sourceFolder } = configurationStore.store
      console.log(`Source folder: ${sourceFolder}`);
      const absolutePath = sourceFolder ? path.resolve(sourceFolder, filePath) : path.resolve(filePath)
      log.info(`Reading file from absolute path: ${absolutePath}`)
      const content = await readFile(absolutePath, 'utf-8')
      log.info(`File read successfully: ${filePath}`)
      return content
    } catch (err: any) {
      log.error(`Error reading file ${filePath}:`, err)
      // return `Error reading file: ${err.message || 'Unknown error'}`
    }
  })

  ipcMain.handle(IPC.SYSTEM.WRITE_FILE, async (_event, filePath: string, content: string) => {
    log.info(`Attempting to write file: ${filePath}`)
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid filePath provided for writing.')
      }
      const { sourceFolder } = configurationStore.store
      const absolutePath = sourceFolder ? path.resolve(sourceFolder, filePath) : path.resolve(filePath)
      log.info(`Writing file to absolute path: ${absolutePath}`)
      const dir = path.dirname(absolutePath)
      if (!fs.existsSync(dir)) {
        log.info(`Directory ${dir} does not exist. Creating...`)
        await fs.promises.mkdir(dir, { recursive: true })
        log.info(`Directory created: ${dir}`)
      }
      await writeFile(absolutePath, content, 'utf-8')
      log.info(`File written successfully to ${absolutePath}`)
      return { success: true }
    } catch (err: any) {
      log.error(`Error writing file ${filePath}:`, err)
      return { success: false, error: `Error writing file: ${err.message || 'Unknown error'}` }
    }
  })

  log.info('✅ System IPC Handlers Registered')
}
