import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC } from 'main/constants'
import { getSvnChangedFiles } from 'main/svn/getSvnChangedFiles'
import { getSvnDiff } from 'main/svn/getSvnDiff'
import appearanceStore from '../setting/AppearanceStore'
import configurationStore from '../setting/ConfigurationStore'
import mailServerStore from '../setting/MailServerStore'
import OpenAI from 'openai'

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

  ipcMain.handle(IPC.SETTING.APPEARANCE.GET, (_, key) => appearanceStore.get(key))
  ipcMain.handle(IPC.SETTING.APPEARANCE.SET, (_, key, value) => appearanceStore.set(key, value))
  ipcMain.handle(IPC.SETTING.APPEARANCE.HAS, (_, key) => appearanceStore.has(key))
  ipcMain.handle(IPC.SETTING.APPEARANCE.DELETE, (_, key) => appearanceStore.delete(key))

  ipcMain.handle(IPC.SETTING.CONFIGURATION.GET, () => configurationStore.store)
  ipcMain.handle(IPC.SETTING.CONFIGURATION.SET, (_, config) => configurationStore.set(config))

  ipcMain.handle(IPC.SETTING.MAIL_SERVER.GET, () => mailServerStore.store)
  ipcMain.handle(IPC.SETTING.MAIL_SERVER.SET, (_, config) => mailServerStore.set(config))

  ipcMain.handle(IPC.SVN.GET_CHANGED_FILES, async _event => {
    try {
      console.log('Fetching SVN changed files...')
      const { svnFolder, sourceFolder } = configurationStore.store
      if (!svnFolder || !sourceFolder) throw new Error('Missing SVN configuration paths')
      const result = await getSvnChangedFiles()
      return result
    } catch (err) {
      return []
    }
  })

  ipcMain.handle(IPC.SVN.GET_SVN_DIFF, async (_event, selectedFiles: string[]) => {
    try {
      console.log('Fetching SVN changed files...')
      const { svnFolder, sourceFolder } = configurationStore.store
      if (!svnFolder || !sourceFolder) throw new Error('Missing SVN configuration paths')
      const result = await getSvnDiff(selectedFiles)
      return result
    } catch (err) {
      console.error(err)
      return []
    }
  })

  ipcMain.handle(IPC.DIALOG.OPEN_FOLDER, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return ''
    }
    return result.filePaths[0]
  })

  ipcMain.handle(IPC.OPENAI.SEND_MESSAGE, async (_event, { prompt }) => {
    try {
      console.log(prompt)
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
}
