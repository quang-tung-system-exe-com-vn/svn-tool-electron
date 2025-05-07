import log from 'electron-log'
import Store from 'electron-store'

// DEPRECATED: Lưu ý rằng file này không còn được sử dụng nữa.
// Dữ liệu lịch sử giờ đây được lưu trữ trong IndexedDB ở renderer process.
// File này được giữ lại để đảm bảo tính tương thích ngược.

log.info('⚠️ HistoryStore.ts đã bị deprecated. Dữ liệu lịch sử giờ đây được lưu trữ trong IndexedDB.')

interface HistoryStoreSchema {
  commitMessages: HistoryCommitMessage[]
}

const historyStore = new Store<HistoryStoreSchema>({
  name: 'history-commit-messages',
  defaults: {
    commitMessages: [],
  },
})

export const getHistory = (): HistoryCommitMessage[] => {
  log.warn('getHistory() đã bị deprecated. Sử dụng IndexedDB thay thế.')
  return historyStore.get('commitMessages', [])
}

export const addHistory = (newMessage: HistoryCommitMessage): void => {
  log.warn('addHistory() đã bị deprecated. Sử dụng IndexedDB thay thế.')
  const currentHistory = getHistory()
  const updatedHistory = [newMessage, ...currentHistory].slice(0, 50)
  historyStore.set('commitMessages', updatedHistory)
}

export default historyStore
