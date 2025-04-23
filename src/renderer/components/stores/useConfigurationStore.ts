import { create } from 'zustand'

type ConfigurationStore = {
  openaiApiKey: string
  svnFolder: string
  sourceFolder: string
  emailPL: string
  webhookMS: string
  // OneDrive configuration
  oneDriveClientId: string
  oneDriveTenantId: string
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
  // OneDrive configuration defaults
  oneDriveClientId: '',
  oneDriveTenantId: '',
  oneDriveClientSecret: '',
  oneDriveRefreshToken: '',
  setFieldConfiguration: (key, value) => set({ [key]: value }),
  saveConfigurationConfig: async () => {
    const { setFieldConfiguration, saveConfigurationConfig, loadConfigurationConfig, ...config } = get()
    await window.api.configuration.set(config)
  },
  loadConfigurationConfig: async () => {
    const data = await window.api.configuration.get()
    console.log(data)
    for (const [key, value] of Object.entries(data)) {
      set({ [key]: value })
    }
  },
}))
