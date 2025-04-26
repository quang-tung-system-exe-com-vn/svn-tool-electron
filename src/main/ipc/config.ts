import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import path, { join, resolve } from 'node:path'
import { format } from 'node:url'
import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import log from 'electron-log'
import { IPC } from 'main/constants'
import { sendSupportFeedbackToTeams } from 'main/notification/sendTeams'
import historyStore from 'main/store/HistoryStore'
import { blame } from 'main/svn/blame'
import { cat } from 'main/svn/cat'
import { changedFiles } from 'main/svn/changed-files'
import { cleanup } from 'main/svn/cleanup'
import { commit } from 'main/svn/commit'
import { getDiff } from 'main/svn/get-diff'
import { info } from 'main/svn/info'
import { type LogOptions, log as logSvn } from 'main/svn/log'
import { openDiff } from 'main/svn/open-diff'
import { revert } from 'main/svn/revert'
import { type StatisticsOptions, getStatistics } from 'main/svn/statistics'
import { update } from 'main/svn/update'
import OpenAI from 'openai'
import { ENVIRONMENT } from 'shared/constants'
import appearanceStore from '../store/AppearanceStore'
import configurationStore from '../store/ConfigurationStore'
import mailServerStore from '../store/MailServerStore'
import webhookStore from '../store/WebhookStore'
import { parseSpotBugsResult, runSpotBugs } from '../utils/spotbugs'
const { sourceFolder } = configurationStore.store

export function registerConfigIpcHandlers() {
  log.info('✅ Config ipc handlers registered')

  ipcMain.on(IPC.WINDOW.ACTION, async (event, action, data) => {
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
      case 'refresh-spotbugs':
        try {
          const filePaths = win.webContents.getTitle().includes('spotbugs') ? (win as any).filePaths || [] : []
          log.info(win.webContents.getTitle())
          if (filePaths.length > 0) {
            const result = await runSpotBugs(filePaths)
            if (result.status === 'success') {
              const parsedResult = parseSpotBugsResult(result.data)
              win.webContents.send('load-diff-data', {
                filePaths,
                spotbugsResult: parsedResult,
              })
            } else {
              win.webContents.send('load-diff-data', {
                filePaths,
                error: result.message,
              })
            }
          }
        } catch (error) {
          log.error('Error refreshing SpotBugs:', error)
          win.webContents.send('load-diff-data', {
            filePaths: [],
            error: error instanceof Error ? error.message : String(error),
          })
        }
        break
    }
  })

  ipcMain.on(IPC.WINDOW.DIFF_WINDOWS, (event, filePath) => {
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
        contextIsolation: true,
        nodeIntegration: false,
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
    })

    if (ENVIRONMENT.IS_DEV) {
      window.loadURL('http://localhost:4927/#/code-diff-viewer')
    } else {
      window.loadURL(
        format({
          pathname: resolve(__dirname, '../renderer/index.html'),
          protocol: 'file:',
          slashes: true,
          hash: '/code-diff-viewer',
        })
      )
    }

    window.webContents.on('did-finish-load', () => {
      window.webContents.send('load-diff-data', { filePath })
    })
    window.webContents.on('did-finish-load', () => {
      if (ENVIRONMENT.IS_DEV) {
        window.webContents.openDevTools({ mode: 'bottom' })
      }
      window.show()
    })
  })

  ipcMain.on(IPC.WINDOW.SHOW_LOG, (event, filePath) => {
    const window = new BrowserWindow({
      width: 1365,
      height: 768,
      minWidth: 1000,
      minHeight: 800,
      center: true,
      frame: false,
      autoHideMenuBar: true,
      title: 'Logs',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
    })

    if (ENVIRONMENT.IS_DEV) {
      window.loadURL('http://localhost:4927/#/show-log')
    } else {
      window.loadURL(
        format({
          pathname: resolve(__dirname, '../renderer/index.html'),
          protocol: 'file:',
          slashes: true,
          hash: '/show-log',
        })
      )
    }

    window.webContents.on('did-finish-load', () => {
      window.webContents.send('load-diff-data', { filePath })
    })
    window.webContents.on('did-finish-load', () => {
      if (ENVIRONMENT.IS_DEV) {
        window.webContents.openDevTools({ mode: 'bottom' })
      }
      window.show()
    })
  })

  ipcMain.on(IPC.WINDOW.CHECK_CODING_RULES, (event, selectedFiles) => {
    const window = new BrowserWindow({
      width: 1365,
      height: 768,
      minWidth: 1000,
      minHeight: 800,
      center: true,
      frame: false,
      autoHideMenuBar: true,
      title: 'Check Coding Rules',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
    })

    if (ENVIRONMENT.IS_DEV) {
      window.loadURL('http://localhost:4927/#/check-coding-rules')
    } else {
      window.loadURL(
        format({
          pathname: resolve(__dirname, '../renderer/index.html'),
          protocol: 'file:',
          slashes: true,
          hash: '/check-coding-rules',
        })
      )
    }

    window.webContents.on('did-finish-load', () => {
      window.webContents.send('load-diff-data', { selectedFiles })
    })
    window.webContents.on('did-finish-load', () => {
      if (ENVIRONMENT.IS_DEV) {
        window.webContents.openDevTools({ mode: 'bottom' })
      }
      window.show()
    })
  })

  ipcMain.on(IPC.WINDOW.SPOTBUGS, (event, filePaths) => {
    const window = new BrowserWindow({
      width: 1365,
      height: 768,
      minWidth: 1000,
      minHeight: 800,
      center: true,
      frame: false,
      autoHideMenuBar: true,
      title: 'Spotbugs',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
    })

    Object.defineProperty(window, 'filePaths', {
      value: filePaths,
      writable: true,
      configurable: true,
    })

    if (ENVIRONMENT.IS_DEV) {
      window.loadURL('http://localhost:4927/#/spotbugs')
    } else {
      window.loadURL(
        format({
          pathname: resolve(__dirname, '../renderer/index.html'),
          protocol: 'file:',
          slashes: true,
          hash: '/spotbugs',
        })
      )
    }

    window.webContents.on('did-finish-load', async () => {
      try {
        const result = await runSpotBugs(filePaths)
        if (result.status === 'success') {
          const parsedResult = parseSpotBugsResult(result.data)
          window.webContents.send('load-diff-data', {
            filePaths,
            spotbugsResult: parsedResult,
          })
        } else {
          window.webContents.send('load-diff-data', {
            filePaths,
            error: result.message,
          })
        }
      } catch (error) {
        log.error('Error running SpotBugs:', error)
        window.webContents.send('load-diff-data', {
          filePaths,
          error: error instanceof Error ? error.message : String(error),
        })
      }
      if (ENVIRONMENT.IS_DEV) {
        window.webContents.openDevTools({ mode: 'bottom' })
      }
      window.show()
    })
  })

  ipcMain.on(IPC.WINDOW.COMMIT_MESSAGE_HISTORY, event => {
    const window = new BrowserWindow({
      width: 1365,
      height: 768,
      minWidth: 1000,
      minHeight: 800,
      center: true,
      frame: false,
      autoHideMenuBar: true,
      title: 'Commit Message History',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
    })

    if (ENVIRONMENT.IS_DEV) {
      window.loadURL('http://localhost:4927/#/commit-message-history')
    } else {
      window.loadURL(
        format({
          pathname: resolve(__dirname, '../renderer/index.html'),
          protocol: 'file:',
          slashes: true,
          hash: '/commit-message-history',
        })
      )
    }

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

  ipcMain.handle(IPC.HISTORY.GET, () => historyStore.store)
  ipcMain.handle(IPC.HISTORY.SET, (_, data) => historyStore.set(data))

  ipcMain.handle(IPC.SVN.CHANGED_FILES, async _event => await changedFiles())
  ipcMain.handle(IPC.SVN.GET_DIFF, async (_event, selectedFiles: any[]) => await getDiff(selectedFiles))
  ipcMain.handle(IPC.SVN.OPEN_DIFF, async (_event, file: string, status: string) => await openDiff(file, status))
  ipcMain.handle(IPC.SVN.COMMIT, async (_event, commitMessage: string, violations: string, selectedFiles: any[]) => await commit(commitMessage, violations, selectedFiles))
  ipcMain.handle(IPC.SVN.INFO, async (_event, filePath: string) => await info(filePath))
  ipcMain.handle(IPC.SVN.CAT, async (_event, filePath: string) => await cat(filePath))
  ipcMain.handle(IPC.SVN.BLAME, async (_event, filePath: string) => await blame(filePath))
  ipcMain.handle(IPC.SVN.REVERT, async (_event, filePath: string) => await revert(filePath))
  ipcMain.handle(IPC.SVN.CLEANUP, async (_event, options?: string[]) => await cleanup(options))
  ipcMain.handle(IPC.SVN.LOG, async (_event, filePath: string, options?: LogOptions) => await logSvn(filePath, options))
  ipcMain.handle(IPC.SVN.UPDATE, async (_event, filePath?: string) => await update(filePath))
  ipcMain.handle(IPC.SVN.STATISTICS, async (_event, filePath: string, options?: StatisticsOptions) => await getStatistics(filePath, options))

  ipcMain.handle(IPC.OPENAI.SEND_MESSAGE, async (_event, { prompt }) => {
    try {
      log.info('Send message to openAI...')
      const { openaiApiKey } = configurationStore.store
      const openai = new OpenAI({ apiKey: openaiApiKey })
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-nano-2025-04-14',
        messages: [{ role: 'user', content: prompt }],
      })
      return response.choices[0].message.content
    } catch (err) {
      return `Error generating message: ${err}`
    }
  })

  ipcMain.handle(IPC.SYSTEM.OPEN_FOLDER, async () => {
    log.info('Open folder...')
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
      return `Error reading file: ${err}`
    }
  })

  ipcMain.handle(IPC.SYSTEM.WRITE_FILE, async (_event, filePath: string, content: string) => {
    try {
      // Kiểm tra filePath hợp lệ
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid filePath provided')
      }

      console.log(content)

      // Log filePath và absolutePath để kiểm tra
      const { sourceFolder } = configurationStore.store
      const absolutePath = path.resolve(sourceFolder, filePath)

      // Log absolutePath để chắc chắn đúng
      console.log(`Attempting to write file at: ${absolutePath}`)

      // Kiểm tra thư mục đích tồn tại, nếu không, tạo thư mục
      const dir = path.dirname(absolutePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true }) // Tạo thư mục nếu không tồn tại
        console.log(`Directory created: ${dir}`)
      }

      // Ghi file
      await fs.promises.writeFile(absolutePath, content, 'utf-8')
      console.log(`File written successfully to ${absolutePath}`)

      return { success: true }
    } catch (err) {
      log.error('Error writing file:', err) // Log lỗi cụ thể
      return { success: false, error: `Error writing file: ${err}` }
    }
  })

  ipcMain.handle(IPC.NOTIFICATIONS.SEND_SUPPORT_FEEDBACK, async (_event, data: SupportFeedback) => {
    log.info('Received support/feedback data:', data)
    try {
      const result = await sendSupportFeedbackToTeams(data)
      if (result.success) {
        return { status: 'success', message: 'Feedback sent successfully.' }
      }
      return { status: 'error', message: result.error || 'Failed to send feedback.' }
    } catch (error: any) {
      log.error('Error handling SEND_SUPPORT_FEEDBACK IPC:', error)
      return { status: 'error', message: error.message || 'An internal error occurred.' }
    }
  })
}
