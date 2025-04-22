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
  totalEntries?: number
  suggestedStartDate?: string | null
}

type SupportFeedback = {
  type: 'support' | 'feedback'
  email: string
  message: string
  images: string[] // Mảng các đường dẫn hình ảnh hoặc base64 string
}
