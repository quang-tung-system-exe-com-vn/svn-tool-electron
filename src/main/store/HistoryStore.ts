import Store from 'electron-store'

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
  return historyStore.get('commitMessages', [])
}

export const addHistory = (newMessage: HistoryCommitMessage): void => {
  const currentHistory = getHistory()
  const updatedHistory = [newMessage, ...currentHistory].slice(0, 50)
  historyStore.set('commitMessages', updatedHistory)
}

export default historyStore
