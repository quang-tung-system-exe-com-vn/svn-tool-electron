import { BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log'
import { IPC } from 'main/constants'
import { join, resolve } from 'node:path'
import { format } from 'node:url'
import { ENVIRONMENT } from 'shared/constants'
import { parseSpotBugsResult, runSpotBugs } from '../utils/spotbugs'

export function registerWindowIpcHandlers() {
  log.info('🔄 Registering Window IPC Handlers...')

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
        win.hide()
        break
      case 'refresh-spotbugs':
        try {
          const filePaths = (win as any).filePaths || []
          log.info(`Refreshing SpotBugs for window: ${win.webContents.getTitle()} with paths: ${filePaths.join(', ')}`)
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
          } else {
            log.warn('No file paths found for SpotBugs refresh.')
            win.webContents.send('load-diff-data', {
              filePaths: [],
              error: 'No file paths available for SpotBugs analysis in this window.',
            })
          }
        } catch (error) {
          log.error('Error refreshing SpotBugs:', error)
          win.webContents.send('load-diff-data', {
            filePaths: (win as any).filePaths || [],
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

    const url = ENVIRONMENT.IS_DEV
      ? 'http://localhost:4927/#/code-diff-viewer'
      : format({
        pathname: resolve(__dirname, '../renderer/index.html'),
        protocol: 'file:',
        slashes: true,
        hash: '/code-diff-viewer',
      })
    window.loadURL(url)

    window.webContents.on('did-finish-load', () => {
      window.webContents.send('load-diff-data', { filePath })
      if (ENVIRONMENT.IS_DEV) {
        window.webContents.openDevTools({ mode: 'bottom' })
      }
      window.show()
    })
  })

  ipcMain.on(IPC.WINDOW.SHOW_LOG, (event, data) => {
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

    const url = ENVIRONMENT.IS_DEV
      ? 'http://localhost:4927/#/show-log'
      : format({
        pathname: resolve(__dirname, '../renderer/index.html'),
        protocol: 'file:',
        slashes: true,
        hash: '/show-log',
      })
    window.loadURL(url)

    window.webContents.on('did-finish-load', () => {
      // Xử lý cả trường hợp data là object hoặc string
      const dataToSend = typeof data === 'string'
        ? { path: data }
        : data

      // Gửi dữ liệu (bao gồm path và currentRevision nếu có) đến renderer process
      window.webContents.send('load-diff-data', dataToSend)
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

    const url = ENVIRONMENT.IS_DEV
      ? 'http://localhost:4927/#/check-coding-rules'
      : format({
        pathname: resolve(__dirname, '../renderer/index.html'),
        protocol: 'file:',
        slashes: true,
        hash: '/check-coding-rules',
      })
    window.loadURL(url)

    window.webContents.on('did-finish-load', () => {
      window.webContents.send('load-diff-data', { selectedFiles })
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

    const url = ENVIRONMENT.IS_DEV
      ? 'http://localhost:4927/#/spotbugs'
      : format({
        pathname: resolve(__dirname, '../renderer/index.html'),
        protocol: 'file:',
        slashes: true,
        hash: '/spotbugs',
      })
    window.loadURL(url)

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

    const url = ENVIRONMENT.IS_DEV
      ? 'http://localhost:4927/#/commit-message-history'
      : format({
        pathname: resolve(__dirname, '../renderer/index.html'),
        protocol: 'file:',
        slashes: true,
        hash: '/commit-message-history',
      })
    window.loadURL(url)

    window.webContents.on('did-finish-load', () => {
      if (ENVIRONMENT.IS_DEV) {
        window.webContents.openDevTools({ mode: 'bottom' })
      }
      window.show()
    })
  })

  log.info('✅ Window IPC Handlers Registered')
}
