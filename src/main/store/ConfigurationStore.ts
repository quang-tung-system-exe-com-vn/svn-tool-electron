import Store from 'electron-store'

export type Schema = {
  openaiApiKey: string
  svnFolder: string
  sourceFolder: string
  emailPL: string
  webhookMS: string
}

const config = new Store<Schema>({
  name: 'configuration',
  defaults: {
    openaiApiKey: '',
    svnFolder: '',
    sourceFolder: '',
    emailPL: '',
    webhookMS: '',
  },
})

export default config
