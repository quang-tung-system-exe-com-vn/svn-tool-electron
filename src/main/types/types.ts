type CommitInfo = {
  commitUser: string
  commitTime: string
  commitMessage: string
  violations: string
  addedFiles: string[]
  modifiedFiles: string[]
  deletedFiles: string[]
}

type Configuration = {
  openaiApiKey: string
  svnFolder: string
  sourceFolder: string
  emailPL: string
  webhookMS: string
  oneDriveClientId: string
  oneDriveClientSecret: string
  oneDriveRefreshToken: string
}

type MailServerConfig = {
  smtpServer: string
  port: string
  email: string
  password: string
}

type SVNResponse = {
  status: string
  message?: string
  data?: any
  totalEntries?: number
  suggestedStartDate?: string | null
}

type SupportFeedback = {
  type: 'support' | 'feedback'
  email: string
  message: string
  images: string[]
}

type HistoryCommitMessage = {
  message: string
  date: string
}
