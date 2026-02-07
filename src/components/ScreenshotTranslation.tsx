import { useState, useCallback, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import TranslationResult from './TranslationResult'
import { useSettingsStore } from '../stores/settingsStore'

interface TranslationService {
  name: string
  text: string
}

interface TranslationResponse {
  results: TranslationService[]
}

export default function ScreenshotTranslation() {
  const [isSelecting, setIsSelecting] = useState(false)
  const [ocrText, setOcrText] = useState('')
  const [results, setResults] = useState<TranslationService[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })

  const { services } = useSettingsStore()

  const startSelection = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsSelecting(true)
    setStartPos({ x: e.clientX, y: e.clientY })
    setCurrentPos({ x: e.clientX, y: e.clientY })
  }, [])

  const updateSelection = useCallback((e: React.MouseEvent) => {
    if (!isSelecting) return
    e.preventDefault()
    setCurrentPos({ x: e.clientX, y: e.clientY })
  }, [isSelecting])

  const endSelection = useCallback(async (e: React.MouseEvent) => {
    if (!isSelecting) return
    e.preventDefault()

    const width = Math.abs(e.clientX - startPos.x)
    const height = Math.abs(e.clientY - startPos.y)

    if (width < 10 || height < 10) {
      setIsSelecting(false)
      return
    }

    setIsSelecting(false)
    setShowResults(true)

    await captureAndTranslate()
  }, [isSelecting, startPos])

  const cancelSelection = useCallback(() => {
    setIsSelecting(false)
  }, [])

  const detectLanguage = (text: string): string => {
    const chineseRegex = /[\u4e00-\u9fa5]/
    if (chineseRegex.test(text)) {
      return 'zh'
    }
    return 'en'
  }

  const captureAndTranslate = async () => {
    setIsLoading(true)

    try {
      const ocrResult = await invoke<{ text: string, confidence: number }>('ocr', {
        image_path: null,
        image_data: null
      })

      setOcrText(ocrResult.text)

      if (ocrResult.text.trim()) {
        const detected = detectLanguage(ocrResult.text)
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
            text: ocrResult.text,
            source_lang: detected,
            target_lang: target,
            services: serviceNames,
            config: config
          }
        })

        setResults(response.results)
      }
    } catch (error) {
      console.error('Screenshot translation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancelSelection()
      setShowResults(false)
      setOcrText('')
      setResults([])
    }
  }, [cancelSelection])

  useEffect(() => {
    if (isSelecting) {
      document.addEventListener('mousemove', updateSelection as any)
      document.addEventListener('mouseup', endSelection as any)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousemove', updateSelection as any)
      document.removeEventListener('mouseup', endSelection as any)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSelecting, updateSelection, endSelection, handleKeyDown])

  useEffect(() => {
    const handleTrigger = () => {
      setIsSelecting(true)
      // Reset positions?
      setStartPos({ x: 0, y: 0 })
      setCurrentPos({ x: 0, y: 0 })
    }

    window.addEventListener('trigger-screenshot-ocr', handleTrigger)
    return () => {
      window.removeEventListener('trigger-screenshot-ocr', handleTrigger)
    }
  }, [])

  if (!isSelecting && !showResults) {
    return null
  }

  const selectionStyle = isSelecting ? {
    left: Math.min(startPos.x, currentPos.x),
    top: Math.min(startPos.y, currentPos.y),
    width: Math.abs(currentPos.x - startPos.x),
    height: Math.abs(currentPos.y - startPos.y)
  } : null

  return (
    <>
      {isSelecting && (
        <div className="fixed inset-0 bg-black/50 z-50 cursor-crosshair" onMouseDown={startSelection}>
          {selectionStyle && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/10"
              style={selectionStyle}
            />
          )}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg">
            <p className="text-sm">Drag to select region for OCR</p>
            <p className="text-xs text-gray-400 mt-1">Press Escape to cancel</p>
          </div>
        </div>
      )}

      {showResults && !isSelecting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowResults(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto m-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Screenshot Translation</h2>
              <button
                onClick={() => setShowResults(false)}
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
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Processing OCR and translation...</p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {ocrText && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-transparent">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">OCR Text</h3>
                    <p className="text-gray-900 dark:text-white text-base">{ocrText}</p>
                  </div>
                )}
                {results.length > 0 && (
                  <TranslationResult sourceText={ocrText} results={results} />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
