import { contextBridge, ipcRenderer } from 'electron'
import { IPC, PROMPT } from 'main/constants'

// This preload script is used to expose APIs to the renderer process
declare global {
  interface Window {
    api: {
      electron: {
        send: (channel: string, data: any) => void
      }

      appearance: {
        set: (key: string, value: any) => Promise<void>
      }

      configuration: {
        get: () => Promise<Configuration>
        set: (configuration: Configuration) => Promise<void>
      }

      mail_server: {
        get: () => Promise<MailServerConfig>
        set: (config: MailServerConfig) => Promise<void>
      }

      svn: {
        get_changed_files: () => Promise<SVNResponse>
        get_svn_diff: (selectedFiles: any[]) => Promise<SVNResponse>
        open_svn_dif: (filePath: string, status: string) => Promise<SVNResponse>
        commit: (commitMessage: string, violations: string, selectedFiles: any[]) => Promise<SVNResponse>
      }

      openai: {
        send_message: (params: any) => Promise<string>
      }

      webhook: {
        get: () => Promise<{
          webhooks: [
            {
              name: string
              url: string
            },
          ]
        }>
        set: (...args: any[]) => Promise<void>
      }

      select_folder: () => Promise<string>
    }
  }
}

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('api', {
  electron: {
    send: (channel: string, data: any) => ipcRenderer.send(channel, data),
  },

  appearance: {
    set: (key: string, value: any) => ipcRenderer.invoke(IPC.SETTING.APPEARANCE.SET, key, value),
  },

  configuration: {
    get: () => ipcRenderer.invoke(IPC.SETTING.CONFIGURATION.GET),
    set: (config: any) => ipcRenderer.invoke(IPC.SETTING.CONFIGURATION.SET, config),
  },

  mail_server: {
    get: () => ipcRenderer.invoke(IPC.SETTING.MAIL_SERVER.GET),
    set: (config: MailServerConfig) => ipcRenderer.invoke(IPC.SETTING.MAIL_SERVER.SET, config),
  },

  openai: {
    send_message: (data: {
      apiKey: string
      type: keyof typeof PROMPT
      values: Record<string, string>
    }) => {
      const { type, values } = data
      const template = PROMPT[type]
      const prompt = Object.entries(values).reduce((result, [key, val]) => result.replaceAll(`{${key}}`, val), template)
      return ipcRenderer.invoke(IPC.OPENAI.SEND_MESSAGE, {
        apiKey: data.apiKey,
        prompt,
      })
    },
  },

  svn: {
    get_changed_files: () => ipcRenderer.invoke(IPC.SVN.GET_CHANGED_FILES),
    get_svn_diff: (selectedFiles: any[]) => ipcRenderer.invoke(IPC.SVN.GET_SVN_DIFF, selectedFiles),
    open_svn_dif: (filePath: string, status: string) => ipcRenderer.invoke(IPC.SVN.OPEN_SVN_DIFF, filePath, status),
    commit: (commitMessage: string, violations: string, selectedFiles: any[]) => ipcRenderer.invoke(IPC.SVN.COMMIT, commitMessage, violations, selectedFiles),
  },

  webhook: {
    get: () => ipcRenderer.invoke(IPC.SETTING.WEBHOOK.GET),
    set: (webhook: string) => ipcRenderer.invoke(IPC.SETTING.WEBHOOK.SET, webhook),
  },

  select_folder: () => ipcRenderer.invoke(IPC.DIALOG.OPEN_FOLDER),
})

console.log('✅ Preload script loaded')
