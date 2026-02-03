import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { readText } from '@tauri-apps/plugin-clipboard-manager'
import TranslationResult from './TranslationResult'

export default function SelectTranslation() {
  const [clipboardText, setClipboardText] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showTranslateButton, setShowTranslateButton] = useState(false)
  const buttonPosition = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleClipboardChange = async () => {
      try {
        const text = await readText()
        if (text && text.length > 0 && text !== clipboardText) {
          setClipboardText(text)
        }
      } catch (error) {
        console.error('Clipboard read error:', error)
      }
    }

    const checkInterval = setInterval(handleClipboardChange, 1000)

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
      clearInterval(checkInterval)
      document.removeEventListener('mouseup', handleTextSelection)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [clipboardText])

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

  const handleTranslate = async () => {
    if (!clipboardText.trim()) return

    setShowTranslateButton(false)
    setIsLoading(true)

    try {
      const detected = detectLanguage(clipboardText)
      const target = detected === 'zh' ? 'en' : 'zh'

      const response = await invoke<any[]>('translate', {
        text: clipboardText,
        sourceLang: detected,
        targetLang: target,
        services: ['OpenAI', 'DeepL', 'Google']
      })

      setResults(response)
    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setIsLoading(false)
    }
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
          <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto m-4" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">Translate Selection</h2>
              <button
                onClick={() => {
                  setClipboardText('')
                  setResults([])
                }}
                className="w-8 h-8 rounded hover:bg-gray-700 flex items-center justify-center"
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
                  <p className="text-gray-400 text-sm">Translating...</p>
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
