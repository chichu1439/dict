import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TranslationItem {
  id: string
  sourceText: string
  targetText: string
  sourceLang: string
  targetLang: string
  services: string[]
  timestamp: number
  isFavorite: boolean
}

interface HistoryStore {
  history: TranslationItem[]
  favorites: TranslationItem[]
  addToHistory: (item: TranslationItem) => void
  addToFavorites: (item: TranslationItem) => void
  removeFromFavorites: (id: string) => void
  toggleFavorite: (id: string) => void
  clearHistory: () => void
  deleteHistoryItem: (id: string) => void
}

type PersistedHistoryStore = Omit<HistoryStore, 'searchHistory'>

const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      history: [],
      favorites: [],
      
      addToHistory: (item: TranslationItem) => {
        set((state: PersistedHistoryStore) => {
          // 检查是否已有相同源文本和目标语言的历史记录
          const existingIndex = state.history.findIndex(h => 
            h.sourceText === item.sourceText && 
            h.targetLang === item.targetLang
          )
          
          let newHistory: TranslationItem[]
          
          if (existingIndex !== -1) {
            // 如果存在相同记录，移除旧的，添加新的（更新到最新）
            const existingItem = state.history[existingIndex]
            // 保留收藏状态
            const mergedItem = {
              ...item,
              isFavorite: existingItem.isFavorite || item.isFavorite
            }
            newHistory = [
              mergedItem,
              ...state.history.slice(0, existingIndex),
              ...state.history.slice(existingIndex + 1)
            ]
          } else {
            // 如果不存在，直接添加
            newHistory = [item, ...state.history]
          }
          
          return {
            history: newHistory.slice(0, 1000)
          }
        })
      },
      
      addToFavorites: (item: TranslationItem) => {
        set((state: PersistedHistoryStore) => {
          if (state.favorites.some(f => f.id === item.id)) {
            return state
          }
          return { favorites: [item, ...state.favorites] }
        })
      },
      
      removeFromFavorites: (id: string) => {
        set((state: PersistedHistoryStore) => ({
          favorites: state.favorites.filter(f => f.id !== id)
        }))
      },
      
      toggleFavorite: (id: string) => {
        set((state: PersistedHistoryStore) => {
          const historyItem = state.history.find(h => h.id === id)
          const favoriteItem = state.favorites.find(f => f.id === id)
          
          if (favoriteItem) {
            return {
              favorites: state.favorites.filter(f => f.id !== id)
            }
          } else if (historyItem) {
            return {
              history: state.history.map(h => 
                h.id === id ? { ...h, isFavorite: true } : h
              ),
              favorites: [{ ...historyItem, isFavorite: true }, ...state.favorites]
            }
          }
          return state
        })
      },
      
      clearHistory: () => {
        set({ history: [] })
      },
      
      deleteHistoryItem: (id: string) => {
        set((state: PersistedHistoryStore) => ({
          history: state.history.filter(h => h.id !== id)
        }))
      }
    }),
    {
      name: 'history-store',
      partialize: (state: PersistedHistoryStore) => ({
        history: state.history.slice(0, 100),
        favorites: state.favorites
      })
    }
  )
)

export { useHistoryStore }

export const searchHistory = (query: string): TranslationItem[] => {
  const store = useHistoryStore()
  const lowerQuery = query.toLowerCase()
  return store.history.filter((item: TranslationItem) => 
    item.sourceText.toLowerCase().includes(lowerQuery) ||
    item.targetText.toLowerCase().includes(lowerQuery)
  )
}
