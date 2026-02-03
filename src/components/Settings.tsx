import { useState } from 'react'

interface ServiceConfig {
  name: string
  apiKey: string
  enabled: boolean
}

interface HotkeyConfig {
  action: string
  shortcut: string
}

interface Language {
  code: string
  name: string
}

const DEFAULT_HOTKEYS: HotkeyConfig[] = [
  { action: 'Input Translation', shortcut: 'Ctrl+Alt+A' },
  { action: 'Select Text', shortcut: 'Ctrl+Alt+D' },
  { action: 'Screenshot OCR', shortcut: 'Ctrl+Alt+S' },
  { action: 'Silent OCR', shortcut: 'Ctrl+Alt+Shift+S' },
]

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
]

export default function Settings({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('services')
  const [services, setServices] = useState<ServiceConfig[]>([
    { name: 'OpenAI', apiKey: '', enabled: true },
    { name: 'DeepL', apiKey: '', enabled: true },
    { name: 'Google', apiKey: '', enabled: false },
  ])
  const [hotkeys, setHotkeys] = useState(DEFAULT_HOTKEYS)
  const [sourceLang, setSourceLang] = useState('en')
  const [targetLang, setTargetLang] = useState('zh')

  const handleServiceToggle = (index: number) => {
    const newServices = [...services]
    newServices[index].enabled = !newServices[index].enabled
    setServices(newServices)
  }

  const handleApiKeyChange = (index: number, value: string) => {
    const newServices = [...services]
    newServices[index].apiKey = value
    setServices(newServices)
  }

  const handleHotkeyChange = (index: number, value: string) => {
    const newHotkeys = [...hotkeys]
    newHotkeys[index].shortcut = value
    setHotkeys(newHotkeys)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto m-4">
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-gray-700 flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex border-b border-gray-700">
          {['services', 'hotkeys', 'languages', 'appearance'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'services' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Translation Services</h3>
              {services.map((service, index) => (
                <div key={service.name} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">{service.name}</span>
                    <button
                      onClick={() => handleServiceToggle(index)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        service.enabled ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          service.enabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  {service.enabled && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">API Key</label>
                      <input
                        type="password"
                        value={service.apiKey}
                        onChange={(e) => handleApiKeyChange(index, e.target.value)}
                        placeholder="Enter API key"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'hotkeys' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Keyboard Shortcuts</h3>
              {hotkeys.map((hk, index) => (
                <div key={hk.action} className="flex items-center justify-between bg-gray-700 rounded-lg px-4 py-3">
                  <span className="text-sm">{hk.action}</span>
                  <input
                    type="text"
                    value={hk.shortcut}
                    onChange={(e) => handleHotkeyChange(index, e.target.value)}
                    className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-white text-sm w-48 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'languages' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Language Preferences</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Source Language</label>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Target Language</label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Appearance</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Window Opacity</label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    defaultValue="100"
                    className="w-full"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Dark Mode</span>
                  <button className="w-12 h-6 bg-blue-500 rounded-full">
                    <div className="w-5 h-5 bg-white rounded-full translate-x-6" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors">
            Save
          </button>
        </footer>
      </div>
    </div>
  )
}
