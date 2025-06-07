import { contextBridge, ipcRenderer } from 'electron'
import { IPC, PROMPT } from 'main/constants'

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
        changed_files: (targetPath: string) => Promise<SVNResponse>
        get_diff: (selectedFiles: any[]) => Promise<SVNResponse>
        commit: (commitMessage: string, violations: string, selectedFiles: any[]) => Promise<SVNResponse>
        info: (filePath: string, revision?: string) => Promise<any>
        cat: (filePath: string, fileStatus: string, revision?: string) => Promise<any>
        blame: (filePath: string) => Promise<any>
        revert: (filePath: string | string[]) => Promise<any>
        cleanup: (options?: string[]) => Promise<any>
        log: (filePath: string | string[], options?: { limit?: number; offset?: number }) => Promise<any>
        update: (filePath?: string | string[]) => Promise<any>
        open_diff: (filePath: string, options?: { fileStatus: string; revision?: string; currentRevision?: string }) => void
        statistics: (filePath: string, options?: { period?: 'day' | 'week' | 'month' | 'year' | 'all'; dateFrom?: string; dateTo?: string }) => Promise<any>
        merge: (options: { sourcePath: string; targetPath: string; dryRun?: boolean; revision?: string }) => Promise<any>
        merge_resolve_conflict: (filePath: string, resolution: 'working' | 'theirs' | 'mine' | 'base' | '', isRevisionConflict?: boolean, targetPath?: string) => Promise<any>
        merge_create_snapshot: (targetPath: string) => Promise<any>
        merge_get_commits: (options: { sourcePath: string; targetPath: string }) => Promise<any>
      }

      openai: {
        send_message: (params: any) => Promise<string>
        chat: (prompt: string) => Promise<string>
      }

      notification: {
        send_support_feedback: (data: SupportFeedback) => Promise<{ status: string; message?: string }>
      }

      updater: {
        check_for_updates: () => Promise<{
          status: string
          version?: string
          releaseNotes?: string
          error?: string
        }>
        install_updates: () => Promise<void>
        get_version: () => Promise<string>
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

      codingRule: {
        get: () => Promise<{
          codingRules: [
            {
              name: string
              content: string
            },
          ]
        }>
        set: (...args: any[]) => Promise<void>
      }

      system: {
        select_folder: () => Promise<string>
        reveal_in_file_explorer: (filePath: string) => Promise<void>
        read_file: (filePath: string) => Promise<string>
        write_file: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
      }

      sourcefolder: {
        get: () => Promise<{ name: string; path: string }[]>
        set: (sourceFolders: { name: string; path: string }[]) => Promise<void>
      }

      on: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => void
      removeAllListeners: (channel: string) => void
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
    set: (data: any) => ipcRenderer.invoke(IPC.SETTING.CONFIGURATION.SET, data),
  },

  mail_server: {
    get: () => ipcRenderer.invoke(IPC.SETTING.MAIL_SERVER.GET),
    set: (data: MailServerConfig) => ipcRenderer.invoke(IPC.SETTING.MAIL_SERVER.SET, data),
  },

  openai: {
    send_message: (data: {
      type: keyof typeof PROMPT
      values: Record<string, string>
    }) => {
      const { type, values } = data
      const template = PROMPT[type]
      const prompt = Object.entries(values).reduce((result, [key, val]) => {
        if (key !== 'codingRuleName') {
          return result.replaceAll(`{${key}}`, val)
        }
        return result
      }, template)

      return ipcRenderer.invoke(IPC.OPENAI.SEND_MESSAGE, { prompt, codingRuleName: values.codingRuleName })
    },
    chat: (prompt: string) => {
      return ipcRenderer.invoke(IPC.OPENAI.SEND_MESSAGE, { prompt })
    },
  },

  notification: {
    send_support_feedback: (data: SupportFeedback) => ipcRenderer.invoke(IPC.NOTIFICATIONS.SEND_SUPPORT_FEEDBACK, data),
  },

  svn: {
    changed_files: (targetPath: string) => ipcRenderer.invoke(IPC.SVN.CHANGED_FILES, targetPath),
    get_diff: (selectedFiles: any[]) => ipcRenderer.invoke(IPC.SVN.GET_DIFF, selectedFiles),
    commit: (commitMessage: string, violations: string, selectedFiles: any[]) => ipcRenderer.invoke(IPC.SVN.COMMIT, commitMessage, violations, selectedFiles),
    info: (filePath: string) => ipcRenderer.invoke(IPC.SVN.INFO, filePath),
    cat: (filePath: string, fileStatus: string, revision?: string) => ipcRenderer.invoke(IPC.SVN.CAT, filePath, fileStatus, revision),
    blame: (filePath: string) => ipcRenderer.invoke(IPC.SVN.BLAME, filePath),
    revert: (filePath: string | string[]) => ipcRenderer.invoke(IPC.SVN.REVERT, filePath),
    cleanup: (options?: string[]) => ipcRenderer.invoke(IPC.SVN.CLEANUP, options),
    log: (filePath: string | string[], options?: { limit?: number; offset?: number }) => ipcRenderer.invoke(IPC.SVN.LOG, filePath, options),
    update: (filePath?: string | string[]) => ipcRenderer.invoke(IPC.SVN.UPDATE, filePath),
    open_diff: (filePath: string, options?: { fileStatus: string; revision?: string; currentRevision?: string }) =>
      ipcRenderer.send(IPC.WINDOW.DIFF_WINDOWS, { filePath, ...options }),
    statistics: (filePath: string, options?: { period?: 'day' | 'week' | 'month' | 'year' | 'all'; dateFrom?: string; dateTo?: string }) =>
      ipcRenderer.invoke(IPC.SVN.STATISTICS, filePath, options),
    merge: (options: { sourcePath: string; targetPath: string; dryRun?: boolean; revision?: string }) => ipcRenderer.invoke(IPC.SVN.MERGE, options),
    merge_resolve_conflict: (filePath: string, resolution: 'working' | 'theirs' | 'mine' | 'base' | '', isRevisionConflict?: boolean, targetPath?: string) =>
      ipcRenderer.invoke(IPC.SVN.MERGE_RESOLVE_CONFLICT, filePath, resolution, isRevisionConflict, targetPath),
    merge_create_snapshot: (targetPath: string) => ipcRenderer.invoke(IPC.SVN.MERGE_CREATE_SNAPSHOT, targetPath),
    merge_get_commits: (options: { sourcePath: string; targetPath: string }) => ipcRenderer.invoke(IPC.SVN.MERGE_GET_COMMITS, options),
  },

  updater: {
    check_for_updates: () => ipcRenderer.invoke(IPC.UPDATER.CHECK_FOR_UPDATES),
    install_updates: () => ipcRenderer.invoke(IPC.UPDATER.INSTALL_UPDATES),
    get_version: () => ipcRenderer.invoke(IPC.UPDATER.GET_VERSION),
  },

  webhook: {
    get: () => ipcRenderer.invoke(IPC.SETTING.WEBHOOK.GET),
    set: (webhook: string) => ipcRenderer.invoke(IPC.SETTING.WEBHOOK.SET, webhook),
  },

  codingRule: {
    get: () => ipcRenderer.invoke(IPC.SETTING.CODING_RULE.GET),
    set: (config: any) => ipcRenderer.invoke(IPC.SETTING.CODING_RULE.SET, config),
  },

  system: {
    select_folder: () => ipcRenderer.invoke(IPC.SYSTEM.OPEN_FOLDER),
    reveal_in_file_explorer: (filePath: string) => ipcRenderer.invoke(IPC.SYSTEM.REVEAL_IN_FILE_EXPLORER, filePath),
    read_file: (filePath: string) => ipcRenderer.invoke(IPC.SYSTEM.READ_FILE, filePath),
    write_file: (filePath: string, content: string) => ipcRenderer.invoke(IPC.SYSTEM.WRITE_FILE, filePath, content),
  },

  sourcefolder: {
    get: () => ipcRenderer.invoke('sourcefolder:get'),
    set: (sourceFolders: { name: string; path: string }[]) => ipcRenderer.invoke('sourcefolder:set', sourceFolders),
  },

  on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
})
