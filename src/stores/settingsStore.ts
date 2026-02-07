import { create } from 'zustand'
import { Store } from '@tauri-apps/plugin-store'

export interface ServiceConfig {
    name: string
    apiKey?: string
    accessKeyId?: string
    accessKeySecret?: string
    enabled: boolean
    model?: string
}

export interface HotkeyConfig {
    action: string
    shortcut: string
}

interface SettingsState {
    services: ServiceConfig[]
    hotkeys: HotkeyConfig[]
    sourceLang: string
    targetLang: string
    windowOpacity: number
    darkMode: boolean
    uiLanguage: 'en' | 'zh'
    loaded: boolean

    setServices: (services: ServiceConfig[]) => void
    updateService: (index: number, updates: Partial<ServiceConfig>) => void
    setHotkeys: (hotkeys: HotkeyConfig[]) => void
    updateHotkey: (index: number, shortcut: string) => void
    setSourceLang: (lang: string) => void
    setTargetLang: (lang: string) => void
    setWindowOpacity: (opacity: number) => void
    setDarkMode: (enabled: boolean) => void
    setUiLanguage: (lang: 'en' | 'zh') => void
    loadSettings: () => Promise<void>
    saveSettings: () => Promise<void>
}

const DEFAULT_SERVICES: ServiceConfig[] = [
    { name: 'GoogleFree', enabled: true },
    { name: 'DeepL', apiKey: '', enabled: false },
    { name: 'OpenAI', apiKey: '', enabled: false, model: 'gpt-3.5-turbo' },
    { name: 'Zhipu', apiKey: '', enabled: false, model: 'glm-4-flash' },
    { name: 'Groq', apiKey: '', enabled: false, model: 'llama3-8b-8192' },
    { name: 'Gemini', apiKey: '', enabled: false, model: 'gemini-1.5-flash' },
    { name: 'Google', apiKey: '', enabled: false },
    { name: 'Alibaba', accessKeyId: '', accessKeySecret: '', enabled: false },
]

const DEFAULT_HOTKEYS: HotkeyConfig[] = [
    { action: 'Input Translation', shortcut: 'Ctrl+Alt+A' },
    { action: 'Select Text', shortcut: 'Ctrl+Alt+D' },
    { action: 'Screenshot OCR', shortcut: 'Ctrl+Alt+S' },
    { action: 'Silent OCR', shortcut: 'Ctrl+Alt+Shift+S' },
]

let store: Store | null = null

const getStore = async () => {
    if (!store) {
        store = await Store.load('settings.json')
    }
    return store
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    services: DEFAULT_SERVICES,
    hotkeys: DEFAULT_HOTKEYS,
    sourceLang: 'auto',
    targetLang: 'zh',
    windowOpacity: 100,
    darkMode: true,
    uiLanguage: 'en',
    loaded: false,

    setServices: (services) => set({ services }),

    updateService: (index, updates) => {
        const services = [...get().services]
        services[index] = { ...services[index], ...updates }
        set({ services })
    },

    setHotkeys: (hotkeys) => set({ hotkeys }),

    updateHotkey: (index, shortcut) => {
        const hotkeys = [...get().hotkeys]
        hotkeys[index] = { ...hotkeys[index], shortcut }
        set({ hotkeys })
    },

    setSourceLang: (lang) => set({ sourceLang: lang }),
    setTargetLang: (lang) => set({ targetLang: lang }),
    setWindowOpacity: (opacity) => set({ windowOpacity: opacity }),
    setDarkMode: (enabled) => set({ darkMode: enabled }),
    setUiLanguage: (lang) => set({ uiLanguage: lang }),

    loadSettings: async () => {
        try {
            const store = await getStore()

            const services = await store.get<ServiceConfig[]>('services')
            const hotkeys = await store.get<HotkeyConfig[]>('hotkeys')
            const sourceLang = await store.get<string>('sourceLang')
            const targetLang = await store.get<string>('targetLang')
            const windowOpacity = await store.get<number>('windowOpacity')
            const darkMode = await store.get<boolean>('darkMode')
            const uiLanguage = await store.get<'en' | 'zh'>('uiLanguage')

            let mergedServices = DEFAULT_SERVICES
            if (services) {
                mergedServices = DEFAULT_SERVICES.map(defaultService => {
                    const savedService = services.find(s => s.name === defaultService.name)
                    if (savedService) {
                        return { ...defaultService, ...savedService }
                    }
                    return defaultService
                })
            }

            set({
                services: mergedServices,
                hotkeys: hotkeys || DEFAULT_HOTKEYS,
                sourceLang: sourceLang || 'auto',
                targetLang: targetLang || 'zh',
                windowOpacity: windowOpacity ?? 100,
                darkMode: darkMode ?? true,
                uiLanguage: uiLanguage ?? 'en',
                loaded: true,
            })
        } catch (error) {
            console.error('Failed to load settings:', error)
            set({ loaded: true })
        }
    },

    saveSettings: async () => {
        try {
            const store = await getStore()
            const state = get()

            await store.set('services', state.services)
            await store.set('hotkeys', state.hotkeys)
            await store.set('sourceLang', state.sourceLang)
            await store.set('targetLang', state.targetLang)
            await store.set('windowOpacity', state.windowOpacity)
            await store.set('darkMode', state.darkMode)
            await store.set('uiLanguage', state.uiLanguage)

            await store.save()
        } catch (error) {
            console.error('Failed to save settings:', error)
            throw error
        }
    },
}))
