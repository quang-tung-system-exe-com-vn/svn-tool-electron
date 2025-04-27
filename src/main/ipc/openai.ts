import { ipcMain } from 'electron'
import log from 'electron-log'
import { IPC } from 'main/constants'
import OpenAI from 'openai'
import configurationStore from '../store/ConfigurationStore'

export function registerOpenAiIpcHandlers() {
  log.info('🔄 Registering OpenAI IPC Handlers...')
  ipcMain.handle(IPC.OPENAI.SEND_MESSAGE, async (_event, { prompt }) => {
    try {
      log.info('Sending message to OpenAI...')
      const { openaiApiKey } = configurationStore.store
      if (!openaiApiKey) {
        log.error('OpenAI API key is not configured.')
        return 'Error: OpenAI API key is not configured.'
      }
      const openai = new OpenAI({ apiKey: openaiApiKey })
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      })
      log.info('Received response from OpenAI.')
      return response.choices[0].message.content
    } catch (err: any) {
      log.error('Error generating message with OpenAI:', err)
      return `Error generating message: ${err.message || 'An unknown error occurred'}`
    }
  })

  log.info('✅ OpenAI IPC Handlers Registered')
}
