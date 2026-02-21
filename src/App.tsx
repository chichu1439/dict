import { useState, useEffect } from 'react'
import { useSettingsStore } from './stores/settingsStore'
import Sidebar from './components/Sidebar'
import Settings from './components/Settings'
import InputTranslation from './components/InputTranslation'
import SelectTranslation from './components/SelectTranslation'
import History from './components/History'
import Favorites from './components/Favorites'
import { useTheme, useWindowState, useEventListeners, useHotkeys, useDebug } from './hooks'

function App() {
  const [activeTab, setActiveTab] = useState('translate')
  const [translationText, setTranslationText] = useState('')
  const [ocrMeta, setOcrMeta] = useState<{ confidence: number; language?: string } | null>(null)

  const {
    loaded: settingsLoaded,
    loadSettings,
    themePreset,
    hotkeys,
    debugOpen,
    setThemePreset,
    setDebugOpen
  } = useSettingsStore()

  const { debugLog, addDebugLog, clearDebugLog } = useDebug()
  const { lastShortcut } = useEventListeners({
    setActiveTab,
    setTranslationText,
    setOcrMeta,
    addDebugLog
  })

  useTheme()
  useWindowState()
  useHotkeys(addDebugLog)

  useEffect(() => {
    if (!settingsLoaded) {
      loadSettings()
    }
  }, [settingsLoaded, loadSettings])

  const renderContent = () => {
    switch (activeTab) {
      case 'translate':
        return <InputTranslation initialText={translationText} initialOcrInfo={ocrMeta || undefined} />
      case 'history':
        return <History
          onClose={() => setActiveTab('translate')}
          onSelect={(text) => {
            setTranslationText(text)
            setActiveTab('translate')
          }}
        />
      case 'favorites':
        return <Favorites onClose={() => setActiveTab('translate')} />
      case 'settings':
        return <Settings onClose={() => setActiveTab('translate')} />
      default:
        return <InputTranslation />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans selection:bg-[var(--ui-accent)]/30 bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onThemeToggle={() => setThemePreset(themePreset === 'gold' ? 'stone' : 'gold')}
        themeLabel={themePreset === 'gold' ? 'Warm Stone' : 'Black Gold'}
        themeIsGold={themePreset === 'gold'}
      />

      <main className="flex-1 relative flex flex-col min-w-0">
        <div data-tauri-drag-region className="h-8 w-full flex-shrink-0" />

        <div className="flex-1 overflow-hidden relative">
          {renderContent()}
        </div>

        <SelectTranslation />

        {!debugOpen ? (
          <button
            className="fixed bottom-4 right-4 z-[9999] rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] px-3 py-2 text-xs shadow-lg hover:bg-[var(--ui-surface-2)] transition-colors cursor-pointer"
            onClick={() => setDebugOpen(true)}
          >
            Debug
          </button>
        ) : (
          <div className="fixed bottom-4 right-4 bg-[var(--ui-surface-2)] text-[var(--ui-text)] p-3 rounded text-xs z-[9999] max-w-sm break-words shadow-lg border border-[var(--ui-border)]">
            <div className="flex items-center justify-between gap-2 mb-1 border-b border-[var(--ui-border)] pb-1">
              <div className="font-bold">Debug Info</div>
              <button
                className="rounded px-2 py-1 text-[var(--ui-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface)] transition-colors cursor-pointer"
                onClick={() => setDebugOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mb-2">
              Last Shortcut: <span className="text-[var(--ui-accent)]">{lastShortcut || 'None'}</span>
            </div>
            <div className="mb-2 max-h-32 overflow-y-auto">
              <div className="font-semibold text-[var(--ui-muted)]">Recent Logs:</div>
              {debugLog.map((log, i) => (
                <div key={i} className="whitespace-nowrap overflow-hidden text-ellipsis">{log}</div>
              ))}
            </div>
            <div className="mt-2 border-t border-[var(--ui-border)] pt-2">
              <div className="font-semibold text-[var(--ui-muted)] mb-1">Loaded Hotkeys:</div>
              <div className="max-h-24 overflow-y-auto">
                {hotkeys.map(h => (
                  <div key={h.action} className="flex justify-between gap-2">
                    <span>{h.action}:</span>
                    <span className="text-[var(--ui-accent)] font-mono">{h.shortcut}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 flex gap-2 flex-wrap">
              <button
                className="bg-[var(--ui-accent)] text-[#171717] px-2 py-1 rounded hover:bg-[var(--ui-accent-strong)] text-xs cursor-pointer"
                onClick={() => window.dispatchEvent(new CustomEvent('trigger-screenshot-ocr'))}
              >
                Test OCR
              </button>
              <button
                className="bg-[var(--ui-surface)] text-[var(--ui-text)] px-2 py-1 rounded hover:bg-[var(--ui-surface-2)] text-xs cursor-pointer"
                onClick={() => window.dispatchEvent(new CustomEvent('trigger-select-translation'))}
              >
                Test Select
              </button>
              <button
                className="bg-[var(--ui-surface)] text-[var(--ui-text)] px-2 py-1 rounded hover:bg-[var(--ui-surface-2)] text-xs cursor-pointer"
                onClick={() => window.dispatchEvent(new CustomEvent('focus-translation-input'))}
              >
                Test Focus
              </button>
              <button
                className="bg-red-600 px-2 py-1 rounded hover:bg-red-700 text-xs cursor-pointer"
                onClick={clearDebugLog}
              >
                Clear Logs
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
