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

// Khởi tạo IndexedDB khi module được import
indexedDBService.initDB().catch(error => {
  console.error('Lỗi khi khởi tạo IndexedDB từ useHistoryStore:', error)
})

export const useHistoryStore = create<HistoryStore>((set, get) => {
  // Tải dữ liệu ban đầu khi store được tạo
  console.log('Khởi tạo useHistoryStore...')

  return {
    message: '',
    date: '',
    commitMessages: [],

    loadHistoryConfig: async () => {
      console.log('loadHistoryConfig được gọi')
      try {
        const messages = await indexedDBService.getHistoryMessages()
        console.log('Đã tải dữ liệu từ IndexedDB:', messages)
        set({ commitMessages: messages || [] })
      } catch (error) {
        console.error('Lỗi khi tải lịch sử commit:', error)
        set({ commitMessages: [] })
      }
    },

    addHistory: async (history: History): Promise<boolean> => {
      console.log('addHistory được gọi với:', history)
      try {
        await indexedDBService.addHistoryMessage(history)
        console.log('Đã thêm lịch sử thành công')

        // Cập nhật state sau khi thêm thành công
        const messages = await indexedDBService.getHistoryMessages()
        console.log('Cập nhật state với dữ liệu mới:', messages)
        set({ commitMessages: messages || [] })

        return true
      } catch (error) {
        console.error('Lỗi khi thêm lịch sử commit:', error)
        return false
      }
    },
  }
})
