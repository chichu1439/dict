import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CachedTranslation {
  text: string
  timestamp: number
  serviceName: string
}

interface CacheEntry {
  key: string
  result: CachedTranslation
}

interface TranslationCacheState {
  cache: CacheEntry[]
  maxEntries: number
  hitCount: number
  missCount: number

  getCacheKey: (sourceText: string, sourceLang: string, targetLang: string, serviceName: string) => string
  get: (sourceText: string, sourceLang: string, targetLang: string, serviceName: string) => CachedTranslation | null
  set: (sourceText: string, sourceLang: string, targetLang: string, serviceName: string, result: CachedTranslation) => void
  clear: () => void
  getStats: () => { hits: number; misses: number; hitRate: number; entries: number }
}

const generateKey = (sourceText: string, sourceLang: string, targetLang: string, serviceName: string): string => {
  const normalizedText = sourceText.trim().toLowerCase()
  return `${sourceLang}:${targetLang}:${serviceName}:${normalizedText}`
}

const MAX_CACHE_ENTRIES = 500
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export const useTranslationCache = create<TranslationCacheState>()(
  persist(
    (set, get) => ({
      cache: [],
      maxEntries: MAX_CACHE_ENTRIES,
      hitCount: 0,
      missCount: 0,

      getCacheKey: (sourceText, sourceLang, targetLang, serviceName) => {
        return generateKey(sourceText, sourceLang, targetLang, serviceName)
      },

      get: (sourceText, sourceLang, targetLang, serviceName) => {
        const key = generateKey(sourceText, sourceLang, targetLang, serviceName)
        const { cache } = get()
        const entry = cache.find(e => e.key === key)

        if (entry) {
          const now = Date.now()
          if (now - entry.result.timestamp > CACHE_TTL_MS) {
            set(state => ({
              cache: state.cache.filter(e => e.key !== key),
              missCount: state.missCount + 1
            }))
            return null
          }

          set(state => ({ hitCount: state.hitCount + 1 }))
          return entry.result
        }

        set(state => ({ missCount: state.missCount + 1 }))
        return null
      },

      set: (sourceText, sourceLang, targetLang, serviceName, result) => {
        const key = generateKey(sourceText, sourceLang, targetLang, serviceName)
        const { cache, maxEntries } = get()

        const existingIndex = cache.findIndex(e => e.key === key)
        let newCache: CacheEntry[]

        if (existingIndex >= 0) {
          newCache = [...cache]
          newCache[existingIndex] = { key, result }
        } else {
          newCache = [{ key, result }, ...cache]
          if (newCache.length > maxEntries) {
            newCache = newCache.slice(0, maxEntries)
          }
        }

        set({ cache: newCache })
      },

      clear: () => {
        set({ cache: [], hitCount: 0, missCount: 0 })
      },

      getStats: () => {
        const { hitCount, missCount, cache } = get()
        const total = hitCount + missCount
        return {
          hits: hitCount,
          misses: missCount,
          hitRate: total > 0 ? hitCount / total : 0,
          entries: cache.length
        }
      }
    }),
    {
      name: 'translation-cache',
      partialize: (state) => ({
        cache: state.cache,
        hitCount: state.hitCount,
        missCount: state.missCount
      })
    }
  )
)
