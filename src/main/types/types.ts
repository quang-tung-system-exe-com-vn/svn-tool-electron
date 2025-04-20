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
}

// MailServerConfig type
type MailServerConfig = {
  smtpServer: string
  port: string
  email: string
  password: string
}

// SVN Response type
type SVNResponse = {
  status: string
  message?: string
  data?: any
}
