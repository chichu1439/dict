import { useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import TranslationResult from './components/TranslationResult'
import Settings from './components/Settings'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const handleClose = async () => {
    const window = getCurrentWindow()
    await window.close()
  }

  const handleMinimize = async () => {
    const window = getCurrentWindow()
    await window.minimize()
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 select-none">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="font-semibold text-sm">Dictionary App</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded hover:bg-gray-700 flex items-center justify-center transition-colors"
            aria-label="Settings"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 4.914-1.09A2.16 2.16 0 009.093 6.88a2.16 2.16 0 00-1.914-2.617c-.866-.436-1.617-1.395-1.925-1.435a1.724 1.724 0 002.568 1.564 1.724 1.724 0 00.647.312c.542-.593 1.026-1.276 1.43-2.018" />
            </svg>
          </button>
          <button
            onClick={handleMinimize}
            className="w-8 h-8 rounded hover:bg-gray-700 flex items-center justify-center transition-colors"
            aria-label="Minimize"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded hover:bg-red-600 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <TranslationResult
          sourceText="Hello, world!"
          results={[
            { name: 'OpenAI', text: '你好，世界！', icon: 'O' },
            { name: 'DeepL', text: '你好，世界！', icon: 'D' },
            { name: 'Google', text: '你好，世界！', icon: 'G' }
          ]}
        />
      </main>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}

export default App
