import toast from '@/components/ui-elements/Toast'
import { create } from 'zustand'

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

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  message: '',
  date: '',
  commitMessages: [],

  loadHistoryConfig: async () => {
    const data = await window.api.history.get()
    set({ commitMessages: data.commitMessages })
  },

  addHistory: async (history: History): Promise<boolean> => {
    const data = await window.api.history.get()
    data.commitMessages.push(history)
    await window.api.history.set(data)
    set({ commitMessages: data.commitMessages })
    toast.success('History added successfully.')
    return true
  },
}))
