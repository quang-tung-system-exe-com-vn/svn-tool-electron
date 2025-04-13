import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC } from 'main/constants'
import { commit } from 'main/svn/commit'
import { getSvnChangedFiles } from 'main/svn/getSvnChangedFiles'
import { getSvnDiff } from 'main/svn/getSvnDiff'
import { openSvnDiff } from 'main/svn/openSvnDiff'
import OpenAI from 'openai'
import appearanceStore from '../store/AppearanceStore'
import configurationStore from '../store/ConfigurationStore'
import mailServerStore from '../store/MailServerStore'
import webhookStore from '../store/WebhookStore'

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

  ipcMain.handle(IPC.SETTING.APPEARANCE.SET, (_, key, value) => appearanceStore.set(key, value))

  ipcMain.handle(IPC.SETTING.CONFIGURATION.GET, () => configurationStore.store)
  ipcMain.handle(IPC.SETTING.CONFIGURATION.SET, (_, config) => configurationStore.set(config))

  ipcMain.handle(IPC.SETTING.MAIL_SERVER.GET, () => mailServerStore.store)
  ipcMain.handle(IPC.SETTING.MAIL_SERVER.SET, (_, config) => mailServerStore.set(config))

  ipcMain.handle(IPC.SETTING.WEBHOOK.GET, () => webhookStore.store)
  ipcMain.handle(IPC.SETTING.WEBHOOK.SET, (_, config) => webhookStore.set(config))

  ipcMain.handle(IPC.SVN.GET_CHANGED_FILES, async _event => {
    try {
      console.log('Get SVN changed files...')
      const result = await getSvnChangedFiles()
      return result
    } catch (err) {
      return []
    }
  })

  ipcMain.handle(IPC.SVN.GET_SVN_DIFF, async (_event, selectedFiles: any[]) => {
    try {
      console.log('Get SVN diff...')
      const result = await getSvnDiff(selectedFiles)
      return result
    } catch (err) {
      console.error(err)
      return []
    }
  })

  ipcMain.handle(IPC.SVN.OPEN_SVN_DIFF, async (_event, file: string, status: string) => {
    try {
      console.log('Open SVN diff...')
      const result = await openSvnDiff(file, status)
      return result
    } catch (err) {
      console.error(err)
      return []
    }
  })

  ipcMain.handle(IPC.SVN.COMMIT, async (_event, commitMessage: string, violations: string, selectedFiles: any[]) => {
    try {
      console.log('Commit code...')
      const result = await commit(commitMessage, violations, selectedFiles)
      return result
    } catch (err) {
      console.error(err)
      return []
    }
  })

  ipcMain.handle(IPC.OPENAI.SEND_MESSAGE, async (_event, { prompt }) => {
    try {
      console.log('Send message to openAI...')
      const { openaiApiKey } = configurationStore.store
      const openai = new OpenAI({ apiKey: openaiApiKey })
      const response = await openai.chat.completions.create({
        model: 'o3-mini-2025-01-31',
        messages: [{ role: 'user', content: prompt }],
        reasoning_effort: 'low',
        max_completion_tokens: 100000,
      })
      return response.choices[0].message.content
    } catch (err) {
      return `Error generating message: ${err}`
    }
  })

  ipcMain.handle(IPC.DIALOG.OPEN_FOLDER, async () => {
    console.log('Open folder...')
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return ''
    }
    return result.filePaths[0]
  })
}
