import { create } from 'zustand'

type ConfigurationStore = {
  openaiApiKey: string
  svnFolder: string
  sourceFolder: string
  emailPL: string
  webhookMS: string
  codingRule: string
  oneDriveClientId: string
  oneDriveClientSecret: string
  oneDriveRefreshToken: string
  startOnLogin: boolean
  showNotifications: boolean
  enableMailNotification: boolean
  enableTeamsNotification: boolean
  setFieldConfiguration: (key: keyof Omit<ConfigurationStore, 'setFieldConfiguration' | 'saveConfigurationConfig' | 'loadConfigurationConfig'>, value: string | boolean) => void
  saveConfigurationConfig: () => Promise<void>
  loadConfigurationConfig: () => Promise<void>
}

export const useConfigurationStore = create<ConfigurationStore>((set, get) => ({
  openaiApiKey: '',
  svnFolder: '',
  sourceFolder: '',
  emailPL: '',
  webhookMS: '',
  codingRule: '',
  oneDriveClientId: '',
  oneDriveClientSecret: '',
  oneDriveRefreshToken: '',
  startOnLogin: false,
  showNotifications: true,
  enableMailNotification: true,
  enableTeamsNotification: true,
  setFieldConfiguration: (key, value) => set({ [key]: value }),
  saveConfigurationConfig: async () => {
    const { setFieldConfiguration, saveConfigurationConfig, loadConfigurationConfig, ...config } = get()
    await window.api.configuration.set(config)
  },
  loadConfigurationConfig: async () => {
    const data = await window.api.configuration.get()
    for (const [key, value] of Object.entries(data)) {
      if (key in get()) {
        set({ [key]: value })
      }
    }
  },
}))
