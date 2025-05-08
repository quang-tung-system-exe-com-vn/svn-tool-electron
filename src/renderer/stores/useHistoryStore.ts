import logger from '@/services/logger'
import { create } from 'zustand'
import indexedDBService from '../services/indexedDB'

type History = {
  message: string
  date: string
}

type HistoryStore = {
  message: string
  date: string
  commitMessages: History[]
  loadHistoryConfig: () => Promise<void>
  addHistory: (history: History) => Promise<boolean>
}

export const useHistoryStore = create<HistoryStore>((set, get) => {
  logger.info('Initializing useHistoryStore...')
  return {
    message: '',
    date: '',
    commitMessages: [],
    loadHistoryConfig: async () => {
      logger.info('loadHistoryConfig is called')
      try {
        const messages = await indexedDBService.getHistoryMessages()
        logger.info('Data retrieved from IndexedDB:', messages)
        set({ commitMessages: messages || [] })
      } catch (error) {
        logger.error('Error when loading commit:', error)
        set({ commitMessages: [] })
      }
    },

    addHistory: async (history: History): Promise<boolean> => {
      logger.info('addHistory is called with:', history)
      try {
        await indexedDBService.addHistoryMessage(history)
        logger.info('Successfully added history')
        const messages = await indexedDBService.getHistoryMessages()
        logger.info('Data retrieved from IndexedDB:', messages)
        set({ commitMessages: messages || [] })
        return true
      } catch (error) {
        logger.error('EError when adding history:', error)
        return false
      }
    },
  }
})
