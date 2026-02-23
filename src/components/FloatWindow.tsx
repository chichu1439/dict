import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useSettingsStore } from '../stores/settingsStore'

interface TranslationPayload {
  text: string
  ocrInfo?: {
    confidence: number
    language: string
  }
}

interface ServiceResult {
  name: string
  result?: string
  error?: string
}

export default function FloatWindow() {
  const [sourceText, setSourceText] = useState('')
  const [results, setResults] = useState<ServiceResult[]>([])
  const [isTranslating, setIsTranslating] = useState(false)
  
  const { services, targetLang } = useSettingsStore()

  useEffect(() => {
    const unlisten = listen<TranslationPayload>('float-translate', (event) => {
      const { text } = event.payload
      if (text) {
        setSourceText(text)
        handleTranslate(text)
      }
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [])

  const handleTranslate = async (text: string) => {
    if (!text.trim()) return
    
    setIsTranslating(true)
    setResults([])

    const enabledServices = services.filter(s => s.enabled)
    
    const newResults: ServiceResult[] = []
    
    for (const service of enabledServices) {
      try {
        const response = await invoke<{ results: Array<{ name: string; result?: string; error?: string }> }>('translate', {
          request: {
            text,
            target_lang: targetLang,
            services: [service.name]
          }
        })
        
        if (response.results && response.results.length > 0) {
          newResults.push(...response.results)
        }
      } catch (error) {
        newResults.push({
          name: service.name,
          error: String(error)
        })
      }
    }
    
    setResults(newResults)
    setIsTranslating(false)
  }

  const handleMouseDown = async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return
    await getCurrentWindow().startDragging()
  }

  const handleClose = async () => {
    await getCurrentWindow().hide()
  }

  const handleMinimize = async () => {
    await getCurrentWindow().minimize()
  }

  const handleCopy = async (text: string) => {
    await invoke('write_clipboard', { text })
  }

  return (
    <div 
      className="w-full h-full flex flex-col bg-[var(--ui-surface)]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-[var(--ui-border)] overflow-hidden"
      style={{ 
        '--ui-surface': 'rgba(30, 30, 30, 0.95)',
        '--ui-surface-2': 'rgba(50, 50, 50, 0.8)',
        '--ui-text': '#ffffff',
        '--ui-muted': '#888888',
        '--ui-border': 'rgba(255, 255, 255, 0.1)',
        '--ui-accent': '#d4af37',
      } as React.CSSProperties}
    >
      {/* Title Bar - Draggable */}
      <div 
        className="flex items-center justify-between px-3 py-2 bg-[var(--ui-surface-2)] cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[var(--ui-accent)]" />
          <span className="text-xs font-medium text-[var(--ui-muted)]">Float Translation</span>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={handleMinimize}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          >
            <svg className="w-3 h-3 text-[var(--ui-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/50 transition-colors"
          >
            <svg className="w-3 h-3 text-[var(--ui-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Source Text */}
      <div className="px-3 py-2 border-b border-[var(--ui-border)]">
        <div className="text-xs text-[var(--ui-muted)] mb-1">Source</div>
        <div className="text-sm text-[var(--ui-text)] line-clamp-3">{sourceText || 'Waiting for text...'}</div>
      </div>

      {/* Translation Results */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {isTranslating ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-[var(--ui-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length > 0 ? (
          results.map((result, index) => (
            <div key={index} className="p-2 rounded-lg bg-[var(--ui-surface-2)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[var(--ui-accent)]">{result.name}</span>
                {result.result && (
                  <button
                    onClick={() => handleCopy(result.result!)}
                    className="text-xs text-[var(--ui-muted)] hover:text-[var(--ui-text)] transition-colors"
                  >
                    Copy
                  </button>
                )}
              </div>
              {result.error ? (
                <div className="text-xs text-red-400">{result.error}</div>
              ) : (
                <div className="text-sm text-[var(--ui-text)]">{result.result}</div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center text-sm text-[var(--ui-muted)] py-4">
            No translation yet
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[var(--ui-border)] flex items-center justify-between">
        <span className="text-xs text-[var(--ui-muted)]">
          {results.length} service{results.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => sourceText && handleTranslate(sourceText)}
          disabled={isTranslating || !sourceText}
          className="px-3 py-1 text-xs bg-[var(--ui-accent)] text-black rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
