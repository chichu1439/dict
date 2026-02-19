import { create } from 'zustand'
import { Store } from '@tauri-apps/plugin-store'
import { invoke } from '@tauri-apps/api/core'

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
    windowSize: { width: number; height: number } | null
    windowPosition: { x: number; y: number } | null
    windowMaximized: boolean
    ocrLanguage: 'auto' | 'zh' | 'en' | 'ja' | 'ko'
    ocrMode: 'accuracy' | 'speed'
    ocrEnhance: boolean
    ocrLimitMaxSize: boolean
    ocrMaxDimension: number
    ocrResultAutoCloseMs: number
    ocrShowResult: boolean
    darkMode: boolean
    themePreset: 'gold' | 'stone'
    themePreview: boolean
    debugOpen: boolean
    uiLanguage: 'en' | 'zh'
    loaded: boolean

    setServices: (services: ServiceConfig[]) => void
    updateService: (index: number, updates: Partial<ServiceConfig>) => void
    setHotkeys: (hotkeys: HotkeyConfig[]) => void
    updateHotkey: (index: number, shortcut: string) => void
    setSourceLang: (lang: string) => void
    setTargetLang: (lang: string) => void
    setWindowOpacity: (opacity: number) => void
    setWindowSize: (size: { width: number; height: number }) => void
    setWindowPosition: (pos: { x: number; y: number }) => void
    setWindowMaximized: (maximized: boolean) => void
    setOcrLanguage: (lang: 'auto' | 'zh' | 'en' | 'ja' | 'ko') => void
    setOcrMode: (mode: 'accuracy' | 'speed') => void
    setOcrEnhance: (enabled: boolean) => void
    setOcrLimitMaxSize: (enabled: boolean) => void
    setOcrMaxDimension: (value: number) => void
    setOcrResultAutoCloseMs: (value: number) => void
    setOcrShowResult: (enabled: boolean) => void
    setDarkMode: (enabled: boolean) => void
    setThemePreset: (preset: 'gold' | 'stone') => void
    setThemePreview: (enabled: boolean) => void
    setDebugOpen: (enabled: boolean) => void
    setUiLanguage: (lang: 'en' | 'zh') => void
    loadSettings: () => Promise<void>
    saveSettings: () => Promise<void>
    saveUiSettings: () => Promise<void>
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
    { action: 'input_translation', shortcut: 'Ctrl+Alt+A' },
    { action: 'select_translation', shortcut: 'Ctrl+Alt+D' },
    { action: 'screenshot_ocr', shortcut: 'Ctrl+Alt+S' },
    { action: 'silent_ocr', shortcut: 'Ctrl+Alt+Shift+S' },
]

let store: Store | null = null
let uiSaveTimer: ReturnType<typeof setTimeout> | null = null

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
    windowSize: null,
    windowPosition: null,
    windowMaximized: false,
    ocrLanguage: 'auto',
    ocrMode: 'accuracy',
    ocrEnhance: true,
    ocrLimitMaxSize: false,
    ocrMaxDimension: 1600,
    ocrResultAutoCloseMs: 0,
    ocrShowResult: false,
    darkMode: true,
    themePreset: 'gold',
    themePreview: false,
    debugOpen: false,
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
    setWindowOpacity: (opacity) => {
        set({ windowOpacity: opacity })
        scheduleUiSave(get)
    },
    setWindowSize: (size) => {
        set({ windowSize: size })
        scheduleUiSave(get)
    },
    setWindowPosition: (pos) => {
        set({ windowPosition: pos })
        scheduleUiSave(get)
    },
    setWindowMaximized: (maximized) => {
        set({ windowMaximized: maximized })
        scheduleUiSave(get)
    },
    setOcrLanguage: (lang) => {
        set({ ocrLanguage: lang })
        scheduleUiSave(get)
    },
    setOcrMode: (mode) => {
        set({ ocrMode: mode })
        scheduleUiSave(get)
    },
    setOcrEnhance: (enabled) => {
        set({ ocrEnhance: enabled })
        scheduleUiSave(get)
    },
    setOcrLimitMaxSize: (enabled) => {
        set({ ocrLimitMaxSize: enabled })
        scheduleUiSave(get)
    },
    setOcrMaxDimension: (value) => {
        set({ ocrMaxDimension: value })
        scheduleUiSave(get)
    },
    setOcrResultAutoCloseMs: (value) => {
        set({ ocrResultAutoCloseMs: value })
        scheduleUiSave(get)
    },
    setOcrShowResult: (enabled) => {
        set({ ocrShowResult: enabled })
        scheduleUiSave(get)
    },
    setDarkMode: (enabled) => {
        set({ darkMode: enabled })
        scheduleUiSave(get)
    },
    setThemePreset: (preset) => {
        set({ themePreset: preset })
        scheduleUiSave(get)
    },
    setThemePreview: (enabled) => {
        set({ themePreview: enabled })
        scheduleUiSave(get)
    },
    setDebugOpen: (enabled) => {
        set({ debugOpen: enabled })
        scheduleUiSave(get)
    },
    setUiLanguage: (lang) => {
        set({ uiLanguage: lang })
        scheduleUiSave(get)
    },

    loadSettings: async () => {
        try {
            const store = await getStore()

            const services = await store.get<ServiceConfig[]>('services')
            const hotkeys = await store.get<HotkeyConfig[]>('hotkeys')
            const sourceLang = await store.get<string>('sourceLang')
            const targetLang = await store.get<string>('targetLang')
            const windowOpacity = await store.get<number>('windowOpacity')
            const windowSize = await store.get<{ width: number; height: number }>('windowSize')
            const windowPosition = await store.get<{ x: number; y: number }>('windowPosition')
            const windowMaximized = await store.get<boolean>('windowMaximized')
            const ocrLanguage = await store.get<'auto' | 'zh' | 'en' | 'ja' | 'ko'>('ocrLanguage')
            const ocrMode = await store.get<'accuracy' | 'speed'>('ocrMode')
            const ocrEnhance = await store.get<boolean>('ocrEnhance')
            const ocrLimitMaxSize = await store.get<boolean>('ocrLimitMaxSize')
            const ocrMaxDimension = await store.get<number>('ocrMaxDimension')
            const ocrResultAutoCloseMs = await store.get<number>('ocrResultAutoCloseMs')
            const ocrShowResult = await store.get<boolean>('ocrShowResult')
            const darkMode = await store.get<boolean>('darkMode')
            const themePreset = await store.get<'gold' | 'stone'>('themePreset')
            const themePreview = await store.get<boolean>('themePreview')
            const debugOpen = await store.get<boolean>('debugOpen')
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

            const finalHotkeys = hotkeys || DEFAULT_HOTKEYS
            
            // Migrate old action names to new format
            const migratedHotkeys = finalHotkeys.map(hotkey => {
                const actionMap: Record<string, string> = {
                    'Input Translation': 'input_translation',
                    'Select Text': 'select_translation',
                    'Screenshot OCR': 'screenshot_ocr',
                    'Silent OCR': 'silent_ocr'
                }
                
                if (actionMap[hotkey.action]) {
                    return {
                        ...hotkey,
                        action: actionMap[hotkey.action]
                    }
                }
                return hotkey
            })

            set({
                services: mergedServices,
                hotkeys: migratedHotkeys,
                sourceLang: sourceLang || 'auto',
                targetLang: targetLang || 'zh',
                windowOpacity: windowOpacity ?? 100,
                windowSize: windowSize ?? null,
                windowPosition: windowPosition ?? null,
                windowMaximized: windowMaximized ?? false,
                ocrLanguage: ocrLanguage ?? 'auto',
                ocrMode: ocrMode ?? 'accuracy',
                ocrEnhance: ocrEnhance ?? true,
                ocrLimitMaxSize: ocrLimitMaxSize ?? false,
                ocrMaxDimension: ocrMaxDimension ?? 1600,
                ocrResultAutoCloseMs: ocrResultAutoCloseMs ?? 0,
                ocrShowResult: ocrShowResult ?? false,
                darkMode: darkMode ?? true,
                themePreset: themePreset ?? 'gold',
                themePreview: themePreview ?? false,
                debugOpen: debugOpen ?? false,
                uiLanguage: uiLanguage ?? 'en',
                loaded: true,
            })

            // Register hotkeys with backend
            try {
                await invoke('register_hotkeys', { hotkeys: migratedHotkeys })
            } catch (error) {
                console.error('Failed to register hotkeys:', error)
            }
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
            await store.set('windowSize', state.windowSize)
            await store.set('windowPosition', state.windowPosition)
            await store.set('windowMaximized', state.windowMaximized)
            await store.set('ocrLanguage', state.ocrLanguage)
            await store.set('ocrMode', state.ocrMode)
            await store.set('ocrEnhance', state.ocrEnhance)
            await store.set('ocrLimitMaxSize', state.ocrLimitMaxSize)
            await store.set('ocrMaxDimension', state.ocrMaxDimension)
            await store.set('ocrResultAutoCloseMs', state.ocrResultAutoCloseMs)
            await store.set('ocrShowResult', state.ocrShowResult)
            await store.set('darkMode', state.darkMode)
            await store.set('themePreset', state.themePreset)
            await store.set('themePreview', state.themePreview)
            await store.set('debugOpen', state.debugOpen)
            await store.set('uiLanguage', state.uiLanguage)

            await store.save()

            // Register hotkeys with backend
            try {
                await invoke('register_hotkeys', { hotkeys: state.hotkeys })
            } catch (error) {
                console.error('Failed to update hotkeys:', error)
            }
        } catch (error) {
            console.error('Failed to save settings:', error)
            throw error
        }
    },

    saveUiSettings: async () => {
        try {
            const store = await getStore()
            const state = get()

            await store.set('windowOpacity', state.windowOpacity)
            await store.set('windowSize', state.windowSize)
            await store.set('windowPosition', state.windowPosition)
            await store.set('windowMaximized', state.windowMaximized)
            await store.set('ocrLanguage', state.ocrLanguage)
            await store.set('ocrMode', state.ocrMode)
            await store.set('ocrEnhance', state.ocrEnhance)
            await store.set('ocrLimitMaxSize', state.ocrLimitMaxSize)
            await store.set('ocrMaxDimension', state.ocrMaxDimension)
            await store.set('ocrResultAutoCloseMs', state.ocrResultAutoCloseMs)
            await store.set('ocrShowResult', state.ocrShowResult)
            await store.set('darkMode', state.darkMode)
            await store.set('themePreset', state.themePreset)
            await store.set('themePreview', state.themePreview)
            await store.set('debugOpen', state.debugOpen)
            await store.set('uiLanguage', state.uiLanguage)

            await store.save()
        } catch (error) {
            console.error('Failed to save UI settings:', error)
        }
    },
}))

const scheduleUiSave = (get: () => SettingsState) => {
    if (uiSaveTimer) {
        clearTimeout(uiSaveTimer)
    }
    uiSaveTimer = setTimeout(() => {
        void get().saveUiSettings()
    }, 300)
}
