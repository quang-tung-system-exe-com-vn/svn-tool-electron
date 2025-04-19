import { contextBridge, ipcRenderer } from 'electron'
import { IPC, PROMPT } from 'main/constants'

// This preload script is used to expose APIs to the renderer process
declare global {
  interface Window {
    api: {
      electron: {
        send: (channel: string, data: any) => void
      }

      new_window: {
        open_diff: (filePath: string) => void
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
        changed_files: () => Promise<SVNResponse>
        get_diff: (selectedFiles: any[]) => Promise<SVNResponse>
        open_dif: (filePath: string, status: string) => Promise<SVNResponse>
        commit: (commitMessage: string, violations: string, selectedFiles: any[]) => Promise<SVNResponse>
        info: (filePath: string, revision?: string) => Promise<any>
        cat: (filePath: string) => Promise<any>
        blame: (filePath: string) => Promise<any>
        revert: (filePath: string) => Promise<any>
        cleanup: (options?: string[]) => Promise<any>
        log: (filePath: string) => Promise<any>
        update: (filePath?: string) => Promise<any>
      }

      openai: {
        send_message: (params: any) => Promise<string>
      }

      updater: {
        check_for_updates: () => Promise<{
          updateAvailable: boolean
          version?: string
          releaseNotes?: string
          error?: string
        }>
        download_update: () => Promise<{
          status: 'success' | 'error'
          error?: string
        }>
        install_update: () => Promise<{
          status: 'success' | 'error'
          error?: string
        }>
        dialog_response: (type: 'available' | 'downloaded', action: 'accept' | 'cancel') => void
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

      system: {
        select_folder: () => Promise<string>
        reveal_in_file_explorer: (filePath: string) => Promise<void>
        read_file: (filePath: string) => Promise<string>
      }
      on: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => void
    }
  }
}

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('api', {
  electron: {
    send: (channel: string, data: any) => ipcRenderer.send(channel, data),
  },

  new_window: {
    open_diff: (filePath: string) => {
      ipcRenderer.send(IPC.WINDOW.DIFF_WINDOWS, filePath)
    },
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
    changed_files: () => ipcRenderer.invoke(IPC.SVN.CHANGED_FILES),
    get_diff: (selectedFiles: any[]) => ipcRenderer.invoke(IPC.SVN.GET_DIFF, selectedFiles),
    open_dif: (filePath: string, status: string) => ipcRenderer.invoke(IPC.SVN.OPEN_DIFF, filePath, status),
    commit: (commitMessage: string, violations: string, selectedFiles: any[]) => ipcRenderer.invoke(IPC.SVN.COMMIT, commitMessage, violations, selectedFiles),
    info: (filePath: string, revision: string) => ipcRenderer.invoke(IPC.SVN.INFO, filePath, revision),
    cat: (filePath: string) => ipcRenderer.invoke(IPC.SVN.CAT, filePath),
    blame: (filePath: string) => ipcRenderer.invoke(IPC.SVN.BLAME, filePath),
    revert: (filePath: string) => ipcRenderer.invoke(IPC.SVN.REVERT, filePath),
    cleanup: (options?: string[]) => ipcRenderer.invoke(IPC.SVN.CLEANUP, options),
    log: (filePath: string) => ipcRenderer.invoke(IPC.SVN.LOG, filePath),
    update: (filePath?: string) => ipcRenderer.invoke(IPC.SVN.UPDATE, filePath),
  },

  updater: {
    check_for_updates: () => ipcRenderer.invoke(IPC.UPDATER.CHECK_FOR_UPDATES),
    download_update: () => ipcRenderer.invoke(IPC.UPDATER.DOWNLOAD_UPDATE),
    install_update: () => ipcRenderer.invoke(IPC.UPDATER.INSTALL_UPDATE),
    dialog_response: (type: 'available' | 'downloaded', action: 'accept' | 'cancel') => ipcRenderer.send(IPC.UPDATER.DIALOG_RESPONSE, { type, action }),
  },

  webhook: {
    get: () => ipcRenderer.invoke(IPC.SETTING.WEBHOOK.GET),
    set: (webhook: string) => ipcRenderer.invoke(IPC.SETTING.WEBHOOK.SET, webhook),
  },

  system: {
    select_folder: () => ipcRenderer.invoke(IPC.SYSTEM.OPEN_FOLDER),
    reveal_in_file_explorer: (filePath: string) => ipcRenderer.invoke(IPC.SYSTEM.REVEAL_IN_FILE_EXPLORER, filePath),
    read_file: (filePath: string) => ipcRenderer.invoke(IPC.SYSTEM.READ_FILE, filePath),
  },
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
})

console.log('✅ Preload script loaded')
