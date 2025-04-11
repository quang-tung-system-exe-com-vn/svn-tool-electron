import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from 'main/constants'

// This preload script is used to expose APIs to the renderer process
declare global {
  interface Window {
    api: {
      electron: {
        send: (channel: string, data: any) => void
        on: (channel: string, func: (...args: any[]) => void) => void
        removeAllListeners: (channel: string) => void
        invoke: (channel: string, data: any) => Promise<any>
      }

      appearance: {
        get: (key: string) => Promise<any>
        set: (key: string, value: any) => Promise<void>
        has: (key: string) => Promise<boolean>
        delete: (key: string) => Promise<void>
      }

      configuration: {
        get: () => Promise<{
          openaiApiKey: string
          svnFolder: string
          sourceFolder: string
          emailPL: string
          webhookMS: string
        }>
        set: (configuration: {
          openaiApiKey: string
          svnFolder: string
          sourceFolder: string
          emailPL: string
          webhookMS: string
        }) => Promise<void>
      }

      mail_server: {
        get: () => Promise<{
          smtpServer: string
          port: string
          email: string
          password: string
        }>
        set: (config: {
          smtpServer: string
          port: string
          email: string
          password: string
        }) => Promise<void>
      }

      svn: {
        get_changed_files: () => Promise<any[]>
      }

      select_folder: () => Promise<string>
    }
  }
}

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('api', {
  electron: {
    send: (channel: string, data: any) => ipcRenderer.send(channel, data),
    on: (channel: string, func: (...args: any[]) => void) => ipcRenderer.on(channel, func),
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
    invoke: (channel: string, data: any) => ipcRenderer.invoke(channel, data),
  },

  appearance: {
    get: (key: string) => ipcRenderer.invoke(IPC.SETTING.APPEARANCE.GET, key),
    set: (key: string, value: any) => ipcRenderer.invoke(IPC.SETTING.APPEARANCE.SET, key, value),
    has: (key: string) => ipcRenderer.invoke(IPC.SETTING.APPEARANCE.HAS, key),
    delete: (key: string) => ipcRenderer.invoke(IPC.SETTING.APPEARANCE.DELETE, key),
  },

  configuration: {
    get: () => ipcRenderer.invoke(IPC.SETTING.CONFIGURATION.GET),
    set: (config: any) => ipcRenderer.invoke(IPC.SETTING.CONFIGURATION.SET, config),
  },

  mail_server: {
    get: () => ipcRenderer.invoke(IPC.SETTING.MAIL_SERVER.GET),
    set: (config: {
      smtpServer: string
      port: string
      email: string
      password: string
    }) => ipcRenderer.invoke(IPC.SETTING.MAIL_SERVER.SET, config),
  },

  svn: {
    get_changed_files: (svnPath: string, srcPath: string) => ipcRenderer.invoke(IPC.SVN.GET_CHANGED_FILES, svnPath, srcPath),
  },

  select_folder: () => ipcRenderer.invoke(IPC.DIALOG.OPEN_FOLDER),
})

console.log('✅ Preload script loaded')
