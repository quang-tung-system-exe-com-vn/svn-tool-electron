import Store from 'electron-store'

export type Schema = {
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
}

const config = new Store<Schema>({
  name: 'configuration',
  defaults: {
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
  },
})

export default config
