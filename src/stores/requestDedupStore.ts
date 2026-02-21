import { create } from 'zustand'

interface PendingRequest {
  text: string
  sourceLang: string
  targetLang: string
  services: string[]
  timestamp: number
}

interface RequestDedupState {
  pendingRequests: Map<string, PendingRequest>
  
  generateKey: (text: string, sourceLang: string, targetLang: string, services: string[]) => string
  isPending: (text: string, sourceLang: string, targetLang: string, services: string[]) => boolean
  addPending: (text: string, sourceLang: string, targetLang: string, services: string[]) => string
  removePending: (key: string) => void
  clearAll: () => void
}

const generateRequestKey = (
  text: string, 
  sourceLang: string, 
  targetLang: string, 
  services: string[]
): string => {
  const normalizedText = text.trim().toLowerCase()
  const sortedServices = [...services].sort().join(',')
  return `${normalizedText}:${sourceLang}:${targetLang}:${sortedServices}`
}

const REQUEST_TIMEOUT = 30000

export const useRequestDedup = create<RequestDedupState>((set, get) => ({
  pendingRequests: new Map(),

  generateKey: (text, sourceLang, targetLang, services) => {
    return generateRequestKey(text, sourceLang, targetLang, services)
  },

  isPending: (text, sourceLang, targetLang, services) => {
    const key = generateRequestKey(text, sourceLang, targetLang, services)
    const { pendingRequests } = get()
    const pending = pendingRequests.get(key)
    
    if (!pending) return false
    
    if (Date.now() - pending.timestamp > REQUEST_TIMEOUT) {
      set(state => {
        const newMap = new Map(state.pendingRequests)
        newMap.delete(key)
        return { pendingRequests: newMap }
      })
      return false
    }
    
    return true
  },

  addPending: (text, sourceLang, targetLang, services) => {
    const key = generateRequestKey(text, sourceLang, targetLang, services)
    const pending: PendingRequest = {
      text,
      sourceLang,
      targetLang,
      services,
      timestamp: Date.now()
    }
    
    set(state => {
      const newMap = new Map(state.pendingRequests)
      newMap.set(key, pending)
      return { pendingRequests: newMap }
    })
    
    setTimeout(() => {
      const { pendingRequests } = get()
      if (pendingRequests.has(key)) {
        set(state => {
          const newMap = new Map(state.pendingRequests)
          newMap.delete(key)
          return { pendingRequests: newMap }
        })
      }
    }, REQUEST_TIMEOUT)
    
    return key
  },

  removePending: (key) => {
    set(state => {
      const newMap = new Map(state.pendingRequests)
      newMap.delete(key)
      return { pendingRequests: newMap }
    })
  },

  clearAll: () => {
    set({ pendingRequests: new Map() })
  }
}))
