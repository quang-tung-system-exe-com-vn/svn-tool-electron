import path, { join } from 'node:path'
import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { IPC } from 'main/constants'
import { blame } from 'main/svn/blame'
import { cat } from 'main/svn/cat'
import { changedFiles } from 'main/svn/changed-files'
import { cleanup } from 'main/svn/cleanup'
import { commit } from 'main/svn/commit'
import { getDiff } from 'main/svn/get-diff'
import { info } from 'main/svn/info'
import { logXML } from 'main/svn/log-xml'
import { openDiff } from 'main/svn/open-diff'
import { revert } from 'main/svn/revert'
import OpenAI from 'openai'
import appearanceStore from '../store/AppearanceStore'
import configurationStore from '../store/ConfigurationStore'
import mailServerStore from '../store/MailServerStore'
import webhookStore from '../store/WebhookStore'
const { sourceFolder } = configurationStore.store
import { readFile } from 'node:fs/promises'
import { ENVIRONMENT } from 'shared/constants'

export function registerConfigIpcHandlers() {
  console.log('✅ Config ipc handlers registered')

  ipcMain.on(IPC.WINDOW.ACTION, (event, action) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return
    switch (action) {
      case 'minimize':
        win.minimize()
        break
      case 'maximize':
        win.isMaximized() ? win.unmaximize() : win.maximize()
        break
      case 'close':
        win.close()
        break
    }
  })

  ipcMain.on(IPC.WINDOW.DIFF_WINDOWS, (event, { originalCode, modifiedCode }) => {
    const window = new BrowserWindow({
      width: 1365,
      height: 768,
      minWidth: 1000,
      minHeight: 800,
      center: true,
      frame: false,
      autoHideMenuBar: true,
      title: 'Diff Viewer',
      webPreferences: {
        contextIsolation: true, // ✅ Bắt buộc phải có
        nodeIntegration: false, // ✅ An toàn và đúng cho contextBridge
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false, // Disable sandbox for Electron 12+ when using Monaco Editor
      },
    })

    // Gửi dữ liệu đến cửa sổ mới
    window.loadURL('http://localhost:4927/#/code-diff-viewer')

    // Gửi dữ liệu qua IPC cho cửa sổ mới để hiển thị diff
    window.webContents.on('did-finish-load', () => {
      window.webContents.send('load-diff-data', { originalCode, modifiedCode })
    })
    window.webContents.on('did-finish-load', () => {
      if (ENVIRONMENT.IS_DEV) {
        window.webContents.openDevTools({ mode: 'bottom' })
      }
      window.show()
    })
  })

  ipcMain.handle(IPC.SETTING.APPEARANCE.SET, (_, key, value) => appearanceStore.set(key, value))

  ipcMain.handle(IPC.SETTING.CONFIGURATION.GET, () => configurationStore.store)
  ipcMain.handle(IPC.SETTING.CONFIGURATION.SET, (_, config) => configurationStore.set(config))

  ipcMain.handle(IPC.SETTING.MAIL_SERVER.GET, () => mailServerStore.store)
  ipcMain.handle(IPC.SETTING.MAIL_SERVER.SET, (_, config) => mailServerStore.set(config))

  ipcMain.handle(IPC.SETTING.WEBHOOK.GET, () => webhookStore.store)
  ipcMain.handle(IPC.SETTING.WEBHOOK.SET, (_, config) => webhookStore.set(config))

  ipcMain.handle(IPC.SVN.CHANGED_FILES, async _event => await changedFiles())
  ipcMain.handle(IPC.SVN.GET_DIFF, async (_event, selectedFiles: any[]) => await getDiff(selectedFiles))
  ipcMain.handle(IPC.SVN.OPEN_DIFF, async (_event, file: string, status: string) => await openDiff(file, status))
  ipcMain.handle(IPC.SVN.COMMIT, async (_event, commitMessage: string, violations: string, selectedFiles: any[]) => await commit(commitMessage, violations, selectedFiles))
  ipcMain.handle(IPC.SVN.INFO, async (_event, filePath: string) => await info(filePath))
  ipcMain.handle(IPC.SVN.CAT, async (_event, filePath: string) => await cat(filePath))
  ipcMain.handle(IPC.SVN.BLAME, async (_event, filePath: string) => await blame(filePath))
  ipcMain.handle(IPC.SVN.REVERT, async (_event, filePath: string) => await revert(filePath))
  ipcMain.handle(IPC.SVN.CLEANUP, async _event => await cleanup())
  ipcMain.handle(IPC.SVN.LOG_XML, async (_event, filePath: string) => await logXML(filePath))

  ipcMain.handle(IPC.OPENAI.SEND_MESSAGE, async (_event, { prompt }) => {
    try {
      console.log('Send message to openAI...')
      const { openaiApiKey } = configurationStore.store
      const openai = new OpenAI({ apiKey: openaiApiKey })
      const response = await openai.chat.completions.create({
        model: 'o3-mini-2025-01-31',
        messages: [{ role: 'user', content: prompt }],
        reasoning_effort: 'high',
        max_completion_tokens: 100000,
      })
      return response.choices[0].message.content
    } catch (err) {
      return `Error generating message: ${err}`
    }
  })

  ipcMain.handle(IPC.SYSTEM.OPEN_FOLDER, async () => {
    console.log('Open folder...')
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return ''
    }
    return result.filePaths[0]
  })

  ipcMain.handle(IPC.SYSTEM.REVEAL_IN_FILE_EXPLORER, async (_event, filePath: string) => {
    if (!filePath) return
    const absolutePath = path.resolve(sourceFolder, filePath)
    shell.showItemInFolder(absolutePath)
  })

  ipcMain.handle(IPC.SYSTEM.READ_FILE, async (_event, filePath: string) => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid filePath provided')
      }
      const { sourceFolder } = configurationStore.store
      const absolutePath = path.resolve(sourceFolder, filePath)
      const content = await readFile(absolutePath, 'utf-8')
      return content
    } catch (err) {
      return `Error generating message: ${err}`
    }
  })
}
