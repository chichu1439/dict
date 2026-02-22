import { useEffect, useState, useRef } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import ThemeCard from './ThemeCard'
import { en, zh } from '../locales'

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
]

const SERVICE_MODELS: Record<string, string[]> = {
  'OpenAI': ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  'Claude': ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
  'Ernie': ['ernie-4.0-8k', 'ernie-3.5-8k', 'ernie-speed-8k', 'ernie-lite-8k'],
  'Gemini': ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'],
  'Zhipu': ['glm-4', 'glm-4-flash', 'glm-4-plus', 'glm-4-air', 'glm-3-turbo'],
  'Groq': ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  'DeepSeek': ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
  'Alibaba': ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
}

function ModelCombobox({ 
  value, 
  onChange, 
  suggestions,
  placeholder 
}: { 
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [showAll, setShowAll] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const filteredSuggestions = showAll 
    ? suggestions 
    : (inputValue 
        ? suggestions.filter(s => s.toLowerCase().includes(inputValue.toLowerCase()))
        : suggestions)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowAll(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    onChange(e.target.value)
    setShowAll(false)
    setIsOpen(true)
  }

  const handleSelect = (suggestion: string) => {
    setInputValue(suggestion)
    onChange(suggestion)
    setIsOpen(false)
    setShowAll(false)
  }

  const handleFocus = () => {
    setShowAll(true)
    setIsOpen(true)
  }

  const handleToggleDropdown = () => {
    if (!isOpen) {
      setShowAll(true)
      setInputValue(value)
    }
    setIsOpen(!isOpen)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsOpen(false)
      setShowAll(false)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setShowAll(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] text-[var(--ui-text)] pr-8"
      />
      <button
        type="button"
        onClick={handleToggleDropdown}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--ui-surface)] rounded cursor-pointer"
      >
        <svg className={`w-4 h-4 text-[var(--ui-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--ui-surface-2)] cursor-pointer ${
                suggestion === inputValue ? 'bg-[var(--ui-accent)]/10 text-[var(--ui-accent)]' : 'text-[var(--ui-text)]'
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Settings({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('services')
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(0)

  const {
    services, hotkeys, sourceLang, targetLang, windowOpacity, darkMode, themePreset, themePreview, loaded, uiLanguage,
    ocrLanguage, ocrMode, ocrEnhance, ocrLimitMaxSize, ocrMaxDimension, ocrResultAutoCloseMs, ocrShowResult,
    updateService, updateHotkey, setSourceLang, setTargetLang, setWindowOpacity, setDarkMode, setThemePreset, setThemePreview, setUiLanguage,
    setOcrLanguage, setOcrMode, setOcrEnhance, setOcrLimitMaxSize, setOcrMaxDimension, setOcrResultAutoCloseMs, setOcrShowResult,
    loadSettings, saveSettings, setServices
  } = useSettingsStore()

  const applyThemePreview = (preset: 'gold' | 'stone') => {
    if (!themePreview) return
    document.documentElement.setAttribute('data-theme', preset)
  }

  const clearThemePreview = () => {
    if (!themePreview) return
    document.documentElement.setAttribute('data-theme', themePreset || 'gold')
  }

  const t = uiLanguage === 'zh' ? zh.settings : en.settings
  const tCommon = uiLanguage === 'zh' ? zh.common : en.common

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!loaded) {
      loadSettings()
    }
  }, [loaded, loadSettings])

  const handleSave = async () => {
    await saveSettings()
    onClose()
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedItemIndex === null || draggedItemIndex === index) return

    const newServices = [...services]
    const draggedItem = newServices[draggedItemIndex]
    newServices.splice(draggedItemIndex, 1)
    newServices.splice(index, 0, draggedItem)
    
    setServices(newServices)
    setDraggedItemIndex(index)
    
    // If dragging the selected item, update selection index
    if (selectedServiceIndex === draggedItemIndex) {
      setSelectedServiceIndex(index)
    } else if (selectedServiceIndex === index) {
      setSelectedServiceIndex(draggedItemIndex)
    }
  }

  const handleDragEnd = () => {
    setDraggedItemIndex(null)
  }

  const renderServiceConfig = () => {
    const service = services[selectedServiceIndex]
    if (!service) return null

    const models = SERVICE_MODELS[service.name]

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-[var(--ui-text)]">{service.name}</h3>
            {service.enabled && <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">Active</span>}
          </div>
          <button
            onClick={() => updateService(selectedServiceIndex, { enabled: !service.enabled })}
            className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${service.enabled ? 'bg-[var(--ui-accent)]' : 'bg-neutral-300'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${service.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {service.name === 'Alibaba' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ui-muted)] mb-1">{t.services.accessKeyId}</label>
              <input
                type="text"
                value={service.accessKeyId || ''}
                onChange={(e) => updateService(selectedServiceIndex, { accessKeyId: e.target.value })}
                className="w-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] text-[var(--ui-text)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ui-muted)] mb-1">{t.services.accessKeySecret}</label>
              <input
                type="password"
                value={service.accessKeySecret || ''}
                onChange={(e) => updateService(selectedServiceIndex, { accessKeySecret: e.target.value })}
                className="w-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] text-[var(--ui-text)]"
              />
            </div>
          </div>
        ) : service.name === 'Ernie' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ui-muted)] mb-1">{t.services.apiKey}</label>
              <input
                type="password"
                value={service.apiKey || ''}
                onChange={(e) => updateService(selectedServiceIndex, { apiKey: e.target.value })}
                placeholder="API Key"
                className="w-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] text-[var(--ui-text)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ui-muted)] mb-1">{t.services.secretKey || 'Secret Key'}</label>
              <input
                type="password"
                value={service.secretKey || ''}
                onChange={(e) => updateService(selectedServiceIndex, { secretKey: e.target.value })}
                placeholder="Secret Key"
                className="w-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] text-[var(--ui-text)]"
              />
            </div>
          </div>
        ) : service.name === 'GoogleFree' ? (
          <div className="text-sm text-[var(--ui-muted)] italic bg-[var(--ui-surface-2)] p-4 rounded-lg">
            {t.services.noConfigRequired}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ui-muted)] mb-1">{t.services.apiKey}</label>
              <input
                type="password"
                value={service.apiKey || ''}
                onChange={(e) => updateService(selectedServiceIndex, { apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] text-[var(--ui-text)]"
              />
            </div>
          </div>
        )}

        {models && (
          <div>
            <label className="block text-sm font-medium text-[var(--ui-muted)] mb-1">{t.services.model || 'Model'}</label>
            <ModelCombobox
              value={service.model || models[0]}
              onChange={(value) => updateService(selectedServiceIndex, { model: value })}
              suggestions={models}
              placeholder={t.services.selectModel || 'Select or enter model name'}
            />
            <p className="mt-1 text-xs text-[var(--ui-muted)]">
              {t.services.modelHint || 'Select from list or type a custom model name'}
            </p>
          </div>
        )}
      </div>
    )
  }

  useEffect(() => {
    if (!themePreview) {
      document.documentElement.setAttribute('data-theme', themePreset || 'gold')
    }
  }, [themePreview, themePreset])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[var(--ui-surface)] rounded-xl w-full max-w-4xl h-[90vh] max-h-[600px] shadow-2xl flex flex-col overflow-hidden border border-[var(--ui-border)]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--ui-border)] bg-[var(--ui-surface-2)]/60">
          <h2 className="text-xl font-semibold text-[var(--ui-text)]">{t.title}</h2>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-strong)] text-[#171717] rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              {tCommon.save}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--ui-surface-2)] rounded-lg text-[var(--ui-muted)] transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-[var(--ui-surface-2)]/60 border-r border-[var(--ui-border)] flex flex-col">
            <nav className="p-3 space-y-1">
              {['services', 'hotkeys', 'languages', 'appearance', 'ocr'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'bg-[var(--ui-surface)] text-[var(--ui-text)] ring-1 ring-[var(--ui-accent)]'
                      : 'text-[var(--ui-muted)] hover:bg-[var(--ui-surface)]'
                  }`}
                >
                  {/* Icons for tabs */}
                  {tab === 'services' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  )}
                  {tab === 'hotkeys' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  )}
                  {tab === 'languages' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                  {tab === 'appearance' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  )}
                  {tab === 'ocr' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m-5 4h4a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2h2m7-14H8m0 0V4m0 0h8v2" />
                    </svg>
                  )}
                  {/* @ts-ignore */}
                  {t.tabs[tab]}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex overflow-hidden">
            {activeTab === 'services' ? (
              <div className="flex w-full h-full">
                {/* Services List Column */}
                <div className="w-1/3 border-r border-[var(--ui-border)] overflow-y-auto bg-[var(--ui-surface)]">
                  <div className="p-3 space-y-2">
                    {services.map((service, index) => (
                      <div
                        key={service.name}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedServiceIndex(index)}
                        className={`
                          p-3 rounded-lg cursor-pointer transition-all border border-transparent
                          ${selectedServiceIndex === index 
                            ? 'bg-[var(--ui-surface-2)] border-[var(--ui-border)] ring-1 ring-[var(--ui-accent)]' 
                            : 'hover:bg-[var(--ui-surface-2)]'
                          }
                          ${draggedItemIndex === index ? 'opacity-50' : 'opacity-100'}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-medium text-sm ${selectedServiceIndex === index ? 'text-[var(--ui-text)]' : 'text-[var(--ui-muted)]'}`}>
                            {service.name}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${service.enabled ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Config Column */}
                <div className="flex-1 p-6 overflow-y-auto bg-[var(--ui-surface)]">
                  {renderServiceConfig()}
                </div>
              </div>
            ) : (
              <div className="flex-1 p-8 overflow-y-auto bg-[var(--ui-surface)]">
                {activeTab === 'hotkeys' && (
                  <div className="space-y-4 max-w-2xl">
                    <h3 className="text-lg font-medium text-[var(--ui-text)] mb-6">{t.hotkeys.title}</h3>
                    {hotkeys.map((hk, index) => (
                      <div key={hk.action} className="flex items-center justify-between py-3 border-b border-[var(--ui-border)]">
                        <span className="text-sm text-[var(--ui-muted)]">{hk.action}</span>
                        <input
                          type="text"
                          value={hk.shortcut}
                          onChange={(e) => updateHotkey(index, e.target.value)}
                          className="w-32 bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded px-3 py-1.5 text-sm font-mono text-[var(--ui-text)] focus:outline-none focus:border-[var(--ui-accent)] transition-colors text-right"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'languages' && (
                  <div className="space-y-6 max-w-2xl">
                    <h3 className="text-lg font-medium text-[var(--ui-text)] mb-6">{t.languages.title}</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-[var(--ui-muted)] mb-2">{t.languages.ui}</label>
                        <select
                          value={uiLanguage}
                          onChange={(e) => setUiLanguage(e.target.value as 'en' | 'zh')}
                          className="w-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] text-[var(--ui-text)]"
                        >
                          <option value="en">English</option>
                          <option value="zh">简体中文</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-[var(--ui-muted)] mb-2">{t.languages.source}</label>
                          <select
                            value={sourceLang}
                            onChange={(e) => setSourceLang(e.target.value)}
                            className="w-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] text-[var(--ui-text)]"
                          >
                            <option value="auto">Auto Detect</option>
                            {LANGUAGES.map((lang) => (
                              <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--ui-muted)] mb-2">{t.languages.target}</label>
                          <select
                            value={targetLang}
                            onChange={(e) => setTargetLang(e.target.value)}
                            className="w-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] text-[var(--ui-text)]"
                          >
                            {LANGUAGES.map((lang) => (
                              <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div className="space-y-6 max-w-2xl">
                    <h3 className="text-lg font-medium text-[var(--ui-text)] mb-6">{t.appearance.title}</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="text-sm font-medium text-[var(--ui-muted)]">{t.appearance.themePreset}</label>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-xs text-[var(--ui-muted)]">{t.appearance.previewTheme}</span>
                          <span className="text-[11px] text-[var(--ui-muted)]/80">{t.appearance.previewHint}</span>
                          <button
                            onClick={() => setThemePreview(!themePreview)}
                            className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                              themePreview ? 'bg-[var(--ui-accent)]' : 'bg-neutral-300'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${themePreview ? 'translate-x-6' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                        <div className="mt-3 flex gap-3">
                          <ThemeCard
                            preset="gold"
                            title={t.appearance.themeGold}
                            label={darkMode ? t.appearance.labelDark : t.appearance.labelLight}
                            isActive={themePreset === 'gold'}
                            lightBg="radial-gradient(120px 60px at 20% -20%, rgba(212,175,55,0.25), transparent 60%), radial-gradient(120px 60px at 100% 0%, rgba(0,0,0,0.08), transparent 60%), #f8f8f8"
                            darkBg="radial-gradient(120px 60px at 20% -20%, rgba(212,175,55,0.18), transparent 60%), radial-gradient(120px 60px at 100% 0%, rgba(255,255,255,0.08), transparent 60%), #0b0b0b"
                            darkMode={darkMode}
                            onClick={() => setThemePreset('gold')}
                            onHover={() => applyThemePreview('gold')}
                            onLeave={clearThemePreview}
                          />
                          <ThemeCard
                            preset="stone"
                            title={t.appearance.themeStone}
                            label={darkMode ? t.appearance.labelDark : t.appearance.labelLight}
                            isActive={themePreset === 'stone'}
                            lightBg="radial-gradient(120px 60px at 20% -20%, rgba(159,139,107,0.22), transparent 60%), radial-gradient(120px 60px at 100% 0%, rgba(0,0,0,0.06), transparent 60%), #f5f4f1"
                            darkBg="radial-gradient(120px 60px at 20% -20%, rgba(211,176,122,0.18), transparent 60%), radial-gradient(120px 60px at 100% 0%, rgba(255,255,255,0.06), transparent 60%), #0d0c0a"
                            darkMode={darkMode}
                            onClick={() => setThemePreset('stone')}
                            onHover={() => applyThemePreview('stone')}
                            onLeave={clearThemePreview}
                          />
                        </div>
                        <select
                          value={themePreset}
                          onChange={(e) => setThemePreset(e.target.value as 'gold' | 'stone')}
                          className="mt-3 w-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] text-[var(--ui-text)]"
                        >
                          <option value="gold">{t.appearance.themeGold}</option>
                          <option value="stone">{t.appearance.themeStone}</option>
                        </select>
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium text-[var(--ui-muted)]">{t.appearance.opacity}</label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--ui-muted)]">{windowOpacity}%</span>
                            <button
                              onClick={() => setThemePreset('gold')}
                              className="text-[11px] px-2 py-1 rounded border border-[var(--ui-border)] hover:border-[var(--ui-accent)]/60 text-[var(--ui-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer"
                            >
                              {t.appearance.resetTheme}
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="100"
                          value={windowOpacity}
                          onChange={(e) => setWindowOpacity(Number(e.target.value))}
                          className="w-full h-2 bg-[var(--ui-surface-2)] rounded-lg appearance-none cursor-pointer accent-[var(--ui-accent)]"
                        />
                      </div>
                      <div className="flex items-center justify-between py-4 border-t border-[var(--ui-border)]">
                        <span className="text-sm font-medium text-[var(--ui-muted)]">{t.appearance.darkMode}</span>
                        <button
                          onClick={() => setDarkMode(!darkMode)}
                          className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${darkMode ? 'bg-[var(--ui-accent)]' : 'bg-neutral-300'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'ocr' && (
                  <div className="space-y-6 max-w-2xl">
                    <h3 className="text-lg font-medium text-[var(--ui-text)] mb-6">{t.ocr.title}</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-[var(--ui-muted)] mb-2">{t.ocr.language}</label>
                        <select
                          value={ocrLanguage}
                          onChange={(e) => setOcrLanguage(e.target.value as 'auto' | 'zh' | 'en' | 'ja' | 'ko')}
                          className="w-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] text-[var(--ui-text)]"
                        >
                          <option value="auto">{t.ocr.langAuto}</option>
                          <option value="zh">{t.ocr.langZh}</option>
                          <option value="en">{t.ocr.langEn}</option>
                          <option value="ja">{t.ocr.langJa}</option>
                          <option value="ko">{t.ocr.langKo}</option>
                        </select>
                        <p className="mt-1 text-xs text-[var(--ui-muted)]">{t.ocr.languageHint}</p>
                      </div>

                      <div className="flex items-center justify-between py-3 border-t border-[var(--ui-border)]">
                        <div>
                          <div className="text-sm font-medium text-[var(--ui-muted)]">{t.ocr.mode}</div>
                          <div className="text-xs text-[var(--ui-muted)] mt-1">{t.ocr.modeHint}</div>
                        </div>
                        <button
                          onClick={() => setOcrMode(ocrMode === 'accuracy' ? 'speed' : 'accuracy')}
                          className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${ocrMode === 'accuracy' ? 'bg-[var(--ui-accent)]' : 'bg-neutral-300'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${ocrMode === 'accuracy' ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-3 border-t border-[var(--ui-border)]">
                        <div>
                          <div className="text-sm font-medium text-[var(--ui-muted)]">{t.ocr.enhance}</div>
                          <div className="text-xs text-[var(--ui-muted)] mt-1">{t.ocr.enhanceHint}</div>
                        </div>
                        <button
                          onClick={() => setOcrEnhance(!ocrEnhance)}
                          className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${ocrEnhance ? 'bg-[var(--ui-accent)]' : 'bg-neutral-300'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${ocrEnhance ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-3 border-t border-[var(--ui-border)]">
                        <div>
                          <div className="text-sm font-medium text-[var(--ui-muted)]">{t.ocr.limitSize}</div>
                          <div className="text-xs text-[var(--ui-muted)] mt-1">{t.ocr.limitSizeHint}</div>
                        </div>
                        <button
                          onClick={() => setOcrLimitMaxSize(!ocrLimitMaxSize)}
                          className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${ocrLimitMaxSize ? 'bg-[var(--ui-accent)]' : 'bg-neutral-300'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${ocrLimitMaxSize ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                      </div>

                      {ocrLimitMaxSize && (
                        <div className="pt-2">
                          <label className="block text-sm font-medium text-[var(--ui-muted)] mb-2">{t.ocr.maxDimension}</label>
                          <input
                            type="range"
                            min="1200"
                            max="3200"
                            step="200"
                            value={ocrMaxDimension}
                            onChange={(e) => setOcrMaxDimension(Number(e.target.value))}
                            className="w-full h-2 bg-[var(--ui-surface-2)] rounded-lg appearance-none cursor-pointer accent-[var(--ui-accent)]"
                          />
                          <div className="mt-1 text-xs text-[var(--ui-muted)]">{ocrMaxDimension}px</div>
                        </div>
                      )}

                      <div className="flex items-center justify-between py-3 border-t border-[var(--ui-border)]">
                        <div>
                          <div className="text-sm font-medium text-[var(--ui-muted)]">{t.ocr.showResult}</div>
                          <div className="text-xs text-[var(--ui-muted)] mt-1">{t.ocr.showResultHint}</div>
                        </div>
                        <button
                          onClick={() => setOcrShowResult(!ocrShowResult)}
                          className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${ocrShowResult ? 'bg-[var(--ui-accent)]' : 'bg-neutral-300'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${ocrShowResult ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-[var(--ui-border)]">
                        <label className="block text-sm font-medium text-[var(--ui-muted)] mb-2">{t.ocr.autoClose}</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={ocrResultAutoCloseMs / 1000}
                            onChange={(e) => {
                              const seconds = Number(e.target.value)
                              const ms = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds * 1000)) : 0
                              setOcrResultAutoCloseMs(ms)
                            }}
                            className="w-28 h-9 bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded-lg px-3 text-sm text-[var(--ui-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]/30"
                          />
                          <span className="text-sm text-[var(--ui-muted)]">s</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {[1000, 3000, 5000].map(ms => (
                              <button
                                key={ms}
                                onClick={() => setOcrResultAutoCloseMs(ms)}
                                className={`px-2.5 h-8 rounded-lg text-xs border transition-colors cursor-pointer ${ocrResultAutoCloseMs === ms ? 'bg-[var(--ui-accent)] text-[#171717] border-[var(--ui-accent)]' : 'bg-[var(--ui-surface-2)] text-[var(--ui-text)] border-[var(--ui-border)] hover:bg-[var(--ui-surface)]'}`}
                              >
                                {ms / 1000}s
                              </button>
                            ))}
                            <button
                              onClick={() => setOcrResultAutoCloseMs(0)}
                              className={`px-2.5 h-8 rounded-lg text-xs border transition-colors cursor-pointer ${ocrResultAutoCloseMs === 0 ? 'bg-[var(--ui-accent)] text-[#171717] border-[var(--ui-accent)]' : 'bg-[var(--ui-surface-2)] text-[var(--ui-text)] border-[var(--ui-border)] hover:bg-[var(--ui-surface)]'}`}
                            >
                              {t.ocr.autoCloseNever}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
