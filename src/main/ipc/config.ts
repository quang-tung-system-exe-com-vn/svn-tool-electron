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
import { update } from 'main/svn/update'
import { readFile } from 'node:fs/promises'
import path, { join, resolve } from 'node:path'
import { format } from 'node:url'
import OpenAI from 'openai'
import { ENVIRONMENT } from 'shared/constants'
import appearanceStore from '../store/AppearanceStore'
import configurationStore from '../store/ConfigurationStore'
import mailServerStore from '../store/MailServerStore'
import webhookStore from '../store/WebhookStore'
import { checkForUpdates, downloadUpdate, installUpdate } from '../updater'
import { parseSpotBugsResult, runSpotBugs } from '../utils/spotbugs'
const { sourceFolder } = configurationStore.store

export function registerConfigIpcHandlers() {
  console.log('✅ Config ipc handlers registered')

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
        // Re-run SpotBugs analysis on the current files
        try {
          // Get the filePaths from the window's properties
          const filePaths = win.webContents.getTitle().includes('Spotbugs')
            ? (win as any).filePaths || []
            : []

          if (filePaths.length > 0) {
            // Run SpotBugs analysis
            const result = await runSpotBugs(filePaths)

            if (result.status === 'success') {
              // Parse the XML result
              const parsedResult = parseSpotBugsResult(result.data)

              // Send the result to the renderer
              win.webContents.send('load-diff-data', {
                filePaths,
                spotbugsResult: parsedResult
              })
            } else {
              win.webContents.send('load-diff-data', {
                filePaths,
                error: result.message
              })
            }
          }
        } catch (error) {
          console.error('Error refreshing SpotBugs:', error)
          win.webContents.send('load-diff-data', {
            filePaths: [],
            error: error instanceof Error ? error.message : String(error)
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

  ipcMain.on(IPC.WINDOW.CHECK_CODING_RULES, (event, text) => {
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
      window.webContents.send('load-diff-data', { text })
    })
    window.webContents.on('did-finish-load', () => {
      if (ENVIRONMENT.IS_DEV) {
        window.webContents.openDevTools({ mode: 'bottom' })
      }
      window.show()
    })
  })

  ipcMain.on(IPC.WINDOW.SPOTBUGS, (event, filePaths) => {
    // Create a new browser window
    const spotbugsWindow = new BrowserWindow({
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

    // Store the filePaths on the window object for later use
    Object.defineProperty(spotbugsWindow, 'filePaths', {
      value: filePaths,
      writable: true,
      configurable: true
    })

    if (ENVIRONMENT.IS_DEV) {
      spotbugsWindow.loadURL('http://localhost:4927/#/spotbugs')
    } else {
      spotbugsWindow.loadURL(
        format({
          pathname: resolve(__dirname, '../renderer/index.html'),
          protocol: 'file:',
          slashes: true,
          hash: '/spotbugs',
        })
      )
    }

    spotbugsWindow.webContents.on('did-finish-load', async () => {
      try {
        // Run SpotBugs analysis
        const result = await runSpotBugs(filePaths)

        if (result.status === 'success') {
          // Parse the XML result
          const parsedResult = parseSpotBugsResult(result.data)

          // Send the result to the renderer
          spotbugsWindow.webContents.send('load-diff-data', {
            filePaths,
            spotbugsResult: parsedResult
          })
        } else {
          spotbugsWindow.webContents.send('load-diff-data', {
            filePaths,
            error: result.message
          })
        }
      } catch (error) {
        console.error('Error running SpotBugs:', error)
        spotbugsWindow.webContents.send('load-diff-data', {
          filePaths,
          error: error instanceof Error ? error.message : String(error)
        })
      }

      if (ENVIRONMENT.IS_DEV) {
        spotbugsWindow.webContents.openDevTools({ mode: 'bottom' })
      }
      spotbugsWindow.show()
    })
  })

  ipcMain.on(IPC.WINDOW.CLEAN_DIALOG, (event) => {
    const window = new BrowserWindow({
      width: 600,
      height: 700,
      minWidth: 500,
      minHeight: 600,
      center: true,
      frame: false,
      autoHideMenuBar: true,
      title: 'SVN Cleanup',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
    })

    if (ENVIRONMENT.IS_DEV) {
      window.loadURL('http://localhost:4927/#/clean-dialog')
    } else {
      window.loadURL(
        format({
          pathname: resolve(__dirname, '../renderer/index.html'),
          protocol: 'file:',
          slashes: true,
          hash: '/clean-dialog',
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

  ipcMain.handle(IPC.SVN.CHANGED_FILES, async _event => await changedFiles())
  ipcMain.handle(IPC.SVN.GET_DIFF, async (_event, selectedFiles: any[]) => await getDiff(selectedFiles))
  ipcMain.handle(IPC.SVN.OPEN_DIFF, async (_event, file: string, status: string) => await openDiff(file, status))
  ipcMain.handle(IPC.SVN.COMMIT, async (_event, commitMessage: string, violations: string, selectedFiles: any[]) => await commit(commitMessage, violations, selectedFiles))
  ipcMain.handle(IPC.SVN.INFO, async (_event, filePath: string) => await info(filePath))
  ipcMain.handle(IPC.SVN.CAT, async (_event, filePath: string) => await cat(filePath))
  ipcMain.handle(IPC.SVN.BLAME, async (_event, filePath: string) => await blame(filePath))
  ipcMain.handle(IPC.SVN.REVERT, async (_event, filePath: string) => await revert(filePath))
  ipcMain.handle(IPC.SVN.CLEANUP, async (_event, options?: string[]) => await cleanup(options))
  ipcMain.handle(IPC.SVN.LOG_XML, async (_event, filePath: string) => await logXML(filePath))
  ipcMain.handle(IPC.SVN.UPDATE, async (_event, filePath?: string) => await update(filePath))

  ipcMain.handle(IPC.OPENAI.SEND_MESSAGE, async (_event, { prompt }) => {
    try {
      console.log('Send message to openAI...')
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

  // Updater handlers
  ipcMain.handle(IPC.UPDATER.CHECK_FOR_UPDATES, async () => {
    try {
      return await checkForUpdates()
    } catch (error) {
      console.error('Error checking for updates:', error)
      return { updateAvailable: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle(IPC.UPDATER.DOWNLOAD_UPDATE, async () => {
    try {
      downloadUpdate()
      return { status: 'success' }
    } catch (error) {
      console.error('Error downloading update:', error)
      return { status: 'error', error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle(IPC.UPDATER.INSTALL_UPDATE, async () => {
    try {
      installUpdate()
      return { status: 'success' }
    } catch (error) {
      console.error('Error installing update:', error)
      return { status: 'error', error: error instanceof Error ? error.message : String(error) }
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
