import { ipcMain } from 'electron'
import log from 'electron-log'
import { IPC } from 'main/constants'
import { sendSupportFeedbackToTeams } from 'main/notification/sendTeams'

export function registerNotificationsIpcHandlers() {
  log.info('🔄 Registering Notifications IPC Handlers...')

  ipcMain.handle(IPC.NOTIFICATIONS.SEND_SUPPORT_FEEDBACK, async (_event, data: SupportFeedback) => {
    log.info('Received support/feedback data via IPC:', data)
    try {
      const result = await sendSupportFeedbackToTeams(data)
      if (result.success) {
        log.info('Support feedback sent successfully via Teams.')
        return { status: 'success', message: 'Feedback sent successfully.' }
      }
      log.error('Failed to send support feedback via Teams:', result.error)
      return { status: 'error', message: result.error || 'Failed to send feedback.' }
    } catch (error: any) {
      log.error('Error handling SEND_SUPPORT_FEEDBACK IPC:', error)
      return { status: 'error', message: error.message || 'An internal error occurred while sending feedback.' }
    }
  })

  log.info('✅ Notifications IPC Handlers Registered')
}
