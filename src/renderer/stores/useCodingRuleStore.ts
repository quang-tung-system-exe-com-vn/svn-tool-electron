import toast from '@/components/ui-elements/Toast'
import { create } from 'zustand'

type CodingRule = {
  name: string
  content: string
}

type CodingRuleStore = {
  name: string
  content: string
  codingRuleList: CodingRule[]
  loadCodingRuleConfig: () => Promise<void>
  addCodingRule: (codingRule: CodingRule) => Promise<boolean>
  updateCodingRule: (codingRule: CodingRule) => Promise<boolean>
  deleteCodingRule: (name: string) => Promise<boolean>
}

export const useCodingRuleStore = create<CodingRuleStore>((set, get) => ({
  name: '',
  content: '',
  codingRuleList: [],

  loadCodingRuleConfig: async () => {
    const data = await window.api.codingRule.get()
    set({ codingRuleList: data.codingRules })
  },

  addCodingRule: async (codingRule: CodingRule): Promise<boolean> => {
    const data = await window.api.codingRule.get()
    const isDuplicate = data.codingRules.some(item => item.name === codingRule.name)
    if (isDuplicate) {
      toast.warning('Coding rule name already exists.')
      return false
    }

    data.codingRules.push(codingRule)
    await window.api.codingRule.set(data)
    set({ codingRuleList: data.codingRules })
    toast.success('Coding rule added successfully.')
    return true
  },

  updateCodingRule: async (codingRule: CodingRule): Promise<boolean> => {
    const data = await window.api.codingRule.get()
    const index = data.codingRules.findIndex(item => item.name === codingRule.name)
    if (index === -1) {
      toast.error('Coding rule not found.')
      return false
    }

    data.codingRules[index] = codingRule
    await window.api.codingRule.set(data)
    set({ codingRuleList: data.codingRules })
    toast.success('Coding rule updated successfully.')
    return true
  },

  deleteCodingRule: async (name: string): Promise<boolean> => {
    const data = await window.api.codingRule.get()
    const updatedCodingRules = data.codingRules.filter(rule => rule.name !== name)
    await window.api.codingRule.set({ codingRules: updatedCodingRules })
    set({ codingRuleList: updatedCodingRules })
    toast.success('Coding rule deleted successfully.')
    return true
  },
}))
