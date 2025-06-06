import { ipcMain } from 'electron'
import log from 'electron-log'
import { IPC } from 'main/constants'
import OpenAI from 'openai'
import codingRuleStore from '../store/CodingRuleStore'
import configurationStore from '../store/ConfigurationStore'

export function registerOpenAiIpcHandlers() {
  log.info('🔄 Registering OpenAI IPC Handlers...')
  ipcMain.handle(IPC.OPENAI.SEND_MESSAGE, async (_event, { prompt, codingRuleName }) => {
    try {
      let finalPrompt = prompt
      log.info(`Fetching coding rule: ${codingRuleName}`)
      if (codingRuleName) {
        const codingRules = codingRuleStore.get('codingRules')
        const rule = codingRules.find(r => r.name === codingRuleName)
        const rulesContent = rule ? rule.content : 'No specific coding rules provided.'
        finalPrompt = prompt.replace('{coding_rules}', rulesContent)
      } else {
        // Nếu không có coding rule nào được chọn, thay thế placeholder bằng chuỗi trống hoặc thông báo mặc định
        finalPrompt = prompt.replace('{coding_rules}', 'No specific coding rules provided.')
      }

      log.info('Sending message to OpenAI...')
      const { openaiApiKey } = configurationStore.store
      if (!openaiApiKey) {
        log.error('OpenAI API key is not configured.')
        return 'Error: OpenAI API key is not configured.'
      }
      log.info('finalPrompt:', finalPrompt)
      const openai = new OpenAI({ apiKey: openaiApiKey })
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: finalPrompt }],
        temperature: 0.1,
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
