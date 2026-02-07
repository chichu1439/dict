import { create } from 'zustand'
import { Store } from '@tauri-apps/plugin-store'

export interface FavoriteItem {
    id: string
    sourceText: string
    sourceLang: string
    targetLang: string
    translatedText: string
    service: string
    notes?: string
    tags: string[]
    timestamp: number
}

interface FavoritesState {
    items: FavoriteItem[]
    loaded: boolean

    addItem: (item: Omit<FavoriteItem, 'id' | 'timestamp'>) => Promise<void>
    removeItem: (id: string) => Promise<void>
    updateItem: (id: string, updates: Partial<FavoriteItem>) => Promise<void>
    clearFavorites: () => Promise<void>
    searchFavorites: (query: string) => FavoriteItem[]
    filterByTag: (tag: string) => FavoriteItem[]
    loadFavorites: () => Promise<void>
}

let store: Store | null = null

const getStore = async () => {
    if (!store) {
        store = await Store.load('favorites.json')
    }
    return store
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
    items: [],
    loaded: false,

    addItem: async (item) => {
        const newItem: FavoriteItem = {
            ...item,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
        }

        const items = [newItem, ...get().items]
        set({ items })

        try {
            const store = await getStore()
            await store.set('items', items)
            await store.save()
        } catch (error) {
            console.error('Failed to save favorite:', error)
        }
    },

    removeItem: async (id) => {
        const items = get().items.filter(item => item.id !== id)
        set({ items })

        try {
            const store = await getStore()
            await store.set('items', items)
            await store.save()
        } catch (error) {
            console.error('Failed to remove favorite:', error)
        }
    },

    updateItem: async (id, updates) => {
        const items = get().items.map(item =>
            item.id === id ? { ...item, ...updates } : item
        )
        set({ items })

        try {
            const store = await getStore()
            await store.set('items', items)
            await store.save()
        } catch (error) {
            console.error('Failed to update favorite:', error)
        }
    },

    clearFavorites: async () => {
        set({ items: [] })

        try {
            const store = await getStore()
            await store.set('items', [])
            await store.save()
        } catch (error) {
            console.error('Failed to clear favorites:', error)
        }
    },

    searchFavorites: (query) => {
        const lowerQuery = query.toLowerCase()
        return get().items.filter(item =>
            item.sourceText.toLowerCase().includes(lowerQuery) ||
            item.translatedText.toLowerCase().includes(lowerQuery) ||
            item.notes?.toLowerCase().includes(lowerQuery) ||
            item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        )
    },

    filterByTag: (tag) => {
        return get().items.filter(item => item.tags.includes(tag))
    },

    loadFavorites: async () => {
        try {
            const store = await getStore()
            const items = await store.get<FavoriteItem[]>('items')
            set({ items: items || [], loaded: true })
        } catch (error) {
            console.error('Failed to load favorites:', error)
            set({ loaded: true })
        }
    },
}))
