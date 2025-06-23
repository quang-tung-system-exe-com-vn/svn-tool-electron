export type CommitInfo = {
  commitUser: string
  commitTime: string
  commitMessage: string
  violations: string
  addedFiles: string[]
  modifiedFiles: string[]
  deletedFiles: string[]
}

export type Configuration = {
  openaiApiKey: string
  svnFolder: string
  sourceFolder: string
  emailPL: string
  webhookMS: string
  oneDriveClientId: string
  oneDriveClientSecret: string
  oneDriveRefreshToken: string
}

export type MailServerConfig = {
  smtpServer: string
  port: string
  email: string
  password: string
}

export type SVNResponse = {
  status: string
  message?: string
  data?: any
  totalEntries?: number
  suggestedStartDate?: string | null
  sourceFolderPrefix?: string
  workingCopyRootFolder?: string
}

export type SupportFeedback = {
  type: 'support' | 'feedback'
  email: string
  message: string
  images: string[]
}

export type HistoryCommitMessage = {
  message: string
  date: string
}
