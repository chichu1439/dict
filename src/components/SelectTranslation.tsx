import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { readText } from '@tauri-apps/plugin-clipboard-manager'
import TranslationResult from './TranslationResult'
import { useSettingsStore } from '../stores/settingsStore'

interface TranslationService {
  name: string
  text: string
}

interface TranslationResponse {
  results: TranslationService[]
}

export default function SelectTranslation() {
  const [clipboardText, setClipboardText] = useState('')
  const [results, setResults] = useState<TranslationService[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showTranslateButton, setShowTranslateButton] = useState(false)
  const buttonPosition = useRef({ x: 0, y: 0 })

  const { services } = useSettingsStore()

  useEffect(() => {
    const handleTrigger = async (e: Event) => {
      window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Select Translation triggered' }));
      try {
        let text = (e as CustomEvent).detail;
        // If text is not provided in event (e.g. manual trigger or fallback), read clipboard
        if (!text || typeof text !== 'string') {
             text = await readText();
        }

        if (text && text.trim().length > 0) {
          window.dispatchEvent(new CustomEvent('debug-log', { detail: `Clipboard text found: ${text.substring(0, 20)}...` }));
          setClipboardText(text)
          
          // Trigger translation immediately
          setIsLoading(true)
          translateText(text)
          
          // Bring window to front/focus if it's not
          const appWindow = await import('@tauri-apps/api/window').then(m => m.getCurrentWindow());
          await appWindow.setFocus();
        } else {
             window.dispatchEvent(new CustomEvent('debug-log', { detail: 'Clipboard is empty' }));
        }
      } catch (error) {
        console.error('Clipboard read error:', error)
        window.dispatchEvent(new CustomEvent('debug-log', { detail: `Clipboard error: ${String(error)}` }));
      }
    }

    window.addEventListener('trigger-select-translation', handleTrigger)
    
    // Cleanup polling for now as it might be annoying
    // const checkInterval = setInterval(handleClipboardChange, 1000)

    const handleTextSelection = (e: MouseEvent) => {
      const selection = window.getSelection()
      if (selection && selection.toString().trim().length > 0) {
        buttonPosition.current = { x: e.clientX + 10, y: e.clientY + 10 }
        setShowTranslateButton(true)
      } else {
        setShowTranslateButton(false)
      }
    }

    document.addEventListener('mouseup', handleTextSelection)
    document.addEventListener('keydown', handleEscape)

    return () => {
      // clearInterval(checkInterval)
      window.removeEventListener('trigger-select-translation', handleTrigger)
      document.removeEventListener('mouseup', handleTextSelection)
      document.removeEventListener('keydown', handleEscape)
    }
  }, []) // Remove dependency on clipboardText to avoid loop

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowTranslateButton(false)
      setClipboardText('')
      setResults([])
    }
  }

  const detectLanguage = (text: string): string => {
    const chineseRegex = /[\u4e00-\u9fa5]/
    if (chineseRegex.test(text)) {
      return 'zh'
    }
    return 'en'
  }

  const translateText = async (text: string) => {
    if (!text.trim()) return

    setShowTranslateButton(false)
    setIsLoading(true)

    try {
      const detected = detectLanguage(text)
      const target = detected === 'zh' ? 'en' : 'zh'

      const enabledServices = services.filter(s => s.enabled)
      const serviceNames = enabledServices.map(s => s.name)

      const config: Record<string, any> = {}
      for (const s of enabledServices) {
        config[s.name.toLowerCase()] = {
          apiKey: s.apiKey,
          accessKeyId: s.accessKeyId,
          accessKeySecret: s.accessKeySecret
        }
      }

      const response = await invoke<TranslationResponse>('translate', {
        request: {
          text: text,
          source_lang: detected,
          target_lang: target,
          services: serviceNames,
          config: config
        }
      })

      setResults(response.results)
    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTranslate = () => {
    translateText(clipboardText)
  }

  if (!clipboardText && results.length === 0) {
    return null
  }

  return (
    <>
      {showTranslateButton && (
        <div
          style={{
            position: 'fixed',
            left: buttonPosition.current.x,
            top: buttonPosition.current.y,
            zIndex: 10000,
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm cursor-pointer transition-colors"
          onClick={handleTranslate}
        >
          Translate
        </div>
      )}

      {(clipboardText || results.length > 0) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
          setClipboardText('')
          setResults([])
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto m-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Translate Selection</h2>
              <button
                onClick={() => {
                  setClipboardText('')
                  setResults([])
                }}
                className="w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Translating...</p>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <TranslationResult sourceText={clipboardText} results={results} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
