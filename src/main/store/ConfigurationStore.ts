import Store from 'electron-store'

export type Schema = {
  openaiApiKey: string
  svnFolder: string
  sourceFolder: string
  emailPL: string
  webhookMS: string
  oneDriveClientId: string
  oneDriveClientSecret: string
  oneDriveRefreshToken: string
  startOnLogin: boolean
  showNotifications: boolean
}

const config = new Store<Schema>({
  name: 'configuration',
  defaults: {
    openaiApiKey: '',
    svnFolder: '',
    sourceFolder: '',
    emailPL: '',
    webhookMS: '',
    oneDriveClientId: '',
    oneDriveClientSecret: '',
    oneDriveRefreshToken: '',
    startOnLogin: false,
    showNotifications: true,
  },
})

export default config
