import { create } from 'zustand'

type ConfigurationStore = {
  openaiApiKey: string
  svnFolder: string
  sourceFolder: string
  emailPL: string
  webhookMS: string
  oneDriveClientId: string
  oneDriveClientSecret: string
  oneDriveRefreshToken: string
  setFieldConfiguration: (key: keyof Omit<ConfigurationStore, 'setFieldConfiguration' | 'saveConfigurationConfig' | 'loadConfigurationConfig'>, value: string) => void
  saveConfigurationConfig: () => Promise<void>
  loadConfigurationConfig: () => Promise<void>
}

export const useConfigurationStore = create<ConfigurationStore>((set, get) => ({
  openaiApiKey: '',
  svnFolder: '',
  sourceFolder: '',
  emailPL: '',
  webhookMS: '',
  oneDriveClientId: '',
  oneDriveClientSecret: '',
  oneDriveRefreshToken: '',
  setFieldConfiguration: (key, value) => set({ [key]: value }),
  saveConfigurationConfig: async () => {
    const { setFieldConfiguration, saveConfigurationConfig, loadConfigurationConfig, ...config } = get()
    await window.api.configuration.set(config)
  },
  loadConfigurationConfig: async () => {
    const data = await window.api.configuration.get()
    for (const [key, value] of Object.entries(data)) {
      set({ [key]: value })
    }
  },
}))
