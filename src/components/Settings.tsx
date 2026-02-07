import { useEffect, useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
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
  'OpenAI': ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini'],
  'Gemini': ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  'Zhipu': ['glm-4', 'glm-4-flash', 'glm-4-plus', 'glm-4-air', 'glm-3-turbo'],
  'Groq': ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'],
  'DeepSeek': ['deepseek-chat', 'deepseek-coder'],
  'Alibaba': ['qwen-turbo', 'qwen-plus', 'qwen-max'],
}

export default function Settings({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('services')
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(0)

  const {
    services, hotkeys, sourceLang, targetLang, windowOpacity, darkMode, loaded, uiLanguage,
    updateService, updateHotkey, setSourceLang, setTargetLang, setWindowOpacity, setDarkMode, setUiLanguage,
    loadSettings, saveSettings, setServices
  } = useSettingsStore()

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
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{service.name}</h3>
            {service.enabled && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full dark:bg-green-900/30 dark:text-green-400">Active</span>}
          </div>
          <button
            onClick={() => updateService(selectedServiceIndex, { enabled: !service.enabled })}
            className={`w-12 h-6 rounded-full transition-colors ${service.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${service.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {service.name === 'Alibaba' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.services.accessKeyId}</label>
              <input
                type="text"
                value={service.accessKeyId || ''}
                onChange={(e) => updateService(selectedServiceIndex, { accessKeyId: e.target.value })}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.services.accessKeySecret}</label>
              <input
                type="password"
                value={service.accessKeySecret || ''}
                onChange={(e) => updateService(selectedServiceIndex, { accessKeySecret: e.target.value })}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>
        ) : service.name === 'GoogleFree' ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            {t.services.noConfigRequired}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.services.apiKey}</label>
              <input
                type="password"
                value={service.apiKey || ''}
                onChange={(e) => updateService(selectedServiceIndex, { apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {models && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.services.model || 'Model'}</label>
            <select
              value={service.model || models[0]}
              onChange={(e) => updateService(selectedServiceIndex, { model: e.target.value })}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t.services.selectModel || 'Select a model to use for translation'}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl h-[90vh] max-h-[600px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.title}</h2>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {tCommon.save}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <nav className="p-3 space-y-1">
              {['services', 'hotkeys', 'languages', 'appearance'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
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
                <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-800">
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
                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }
                          ${draggedItemIndex === index ? 'opacity-50' : 'opacity-100'}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-medium text-sm ${selectedServiceIndex === index ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {service.name}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${service.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Config Column */}
                <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-800">
                  {renderServiceConfig()}
                </div>
              </div>
            ) : (
              <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-gray-800">
                {activeTab === 'hotkeys' && (
                  <div className="space-y-4 max-w-2xl">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">{t.hotkeys.title}</h3>
                    {hotkeys.map((hk, index) => (
                      <div key={hk.action} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{hk.action}</span>
                        <input
                          type="text"
                          value={hk.shortcut}
                          onChange={(e) => updateHotkey(index, e.target.value)}
                          className="w-32 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-3 py-1.5 text-sm font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 transition-colors text-right"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'languages' && (
                  <div className="space-y-6 max-w-2xl">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">{t.languages.title}</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.languages.ui}</label>
                        <select
                          value={uiLanguage}
                          onChange={(e) => setUiLanguage(e.target.value as 'en' | 'zh')}
                          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                        >
                          <option value="en">English</option>
                          <option value="zh">简体中文</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.languages.source}</label>
                          <select
                            value={sourceLang}
                            onChange={(e) => setSourceLang(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                          >
                            <option value="auto">Auto Detect</option>
                            {LANGUAGES.map((lang) => (
                              <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.languages.target}</label>
                          <select
                            value={targetLang}
                            onChange={(e) => setTargetLang(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">{t.appearance.title}</h3>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.appearance.opacity}</label>
                          <span className="text-sm text-gray-500">{windowOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="100"
                          value={windowOpacity}
                          onChange={(e) => setWindowOpacity(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                      <div className="flex items-center justify-between py-4 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.appearance.darkMode}</span>
                        <button
                          onClick={() => setDarkMode(!darkMode)}
                          className={`w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
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
