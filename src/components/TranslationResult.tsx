import { useState } from 'react'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { invoke } from '@tauri-apps/api/core'
import { useSettingsStore } from '../stores/settingsStore'
import { en, zh } from '../locales'

interface TranslationService {
  name: string
  text: string
  icon?: string
  error?: string
}

interface TranslationResultProps {
  sourceText?: string
  results: TranslationService[]
  isLoading?: boolean
  onSourceTextChange?: (newText: string) => void
  ocrInfo?: { confidence: number; language?: string }
}

export default function TranslationResult({ sourceText, results, isLoading, onSourceTextChange, ocrInfo }: TranslationResultProps) {
  const [copiedService, setCopiedService] = useState<string | null>(null)
  const [ttsPlaying, setTtsPlaying] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(sourceText || '')
  
  // Update edited text when source text changes externally
  if (sourceText && editedText === '' && !isEditing) {
     setEditedText(sourceText);
  }

  const { uiLanguage } = useSettingsStore()
  const t = uiLanguage === 'zh' ? zh.translate : en.translate

  const handleEditSubmit = () => {
    setIsEditing(false)
    if (editedText !== sourceText && onSourceTextChange) {
      onSourceTextChange(editedText)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleEditSubmit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditedText(sourceText || '')
    }
  }

  const handleCopy = async (text: string, serviceName: string) => {
    try {
      await writeText(text)
      setCopiedService(serviceName)
      setTimeout(() => setCopiedService(null), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const handleTTS = async (serviceName: string) => {
    setTtsPlaying(serviceName)
    try {
      const text = results.find(r => r.name === serviceName)?.text || ''
      await invoke('speak', {
        text: text,
        voice: null
      })
      setTimeout(() => setTtsPlaying(null), 3000)
    } catch (error) {
      console.error('TTS error:', error)
      setTimeout(() => setTtsPlaying(null), 1000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--ui-accent)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[var(--ui-muted)] text-sm">{t.translating}</p>
        </div>
      </div>
    )
  }

  if (!sourceText || results.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--ui-muted)] text-sm">{t.noResultHint}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {sourceText && (
        <div className="bg-[var(--ui-surface)] rounded-xl p-4 shadow-sm border border-[var(--ui-border)] group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--ui-muted)] uppercase tracking-wide">{t.sourceText}</span>
            {ocrInfo && (
              <div className="text-xs text-[var(--ui-muted)] flex items-center gap-2">
                <span>OCR</span>
                {ocrInfo.language && <span className="text-[var(--ui-text)]">{ocrInfo.language}</span>}
                <span className="px-2 py-0.5 rounded-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] text-[var(--ui-text)]">
                  {ocrInfo.confidence.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isEditing && (
                    <button
                        onClick={() => {
                            setEditedText(sourceText)
                            setIsEditing(true)
                        }}
                        className="p-1 rounded hover:bg-[var(--ui-surface-2)] text-[var(--ui-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer"
                        title="Edit source text"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                )}
                <button
                onClick={() => handleCopy(sourceText, 'source')}
                className="p-1 rounded hover:bg-[var(--ui-surface-2)] text-[var(--ui-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer"
                title="Copy to clipboard"
                >
                {copiedService === 'source' ? (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                )}
                </button>
            </div>
          </div>
          
          {isEditing ? (
              <div className="flex flex-col gap-2">
                  <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded p-2 text-[var(--ui-text)] focus:ring-2 focus:ring-[var(--ui-accent)]/30 outline-none resize-none min-h-[80px]"
                      autoFocus
                  />
                  <div className="flex justify-end gap-2">
                      <button 
                          onClick={() => {
                              setIsEditing(false)
                              setEditedText(sourceText)
                          }}
                          className="px-3 py-1 text-xs text-[var(--ui-muted)] hover:bg-[var(--ui-surface-2)] rounded cursor-pointer"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={handleEditSubmit}
                          className="px-3 py-1 text-xs bg-[var(--ui-accent)] text-[#171717] hover:bg-[var(--ui-accent-strong)] rounded cursor-pointer"
                      >
                          Save & Translate
                      </button>
                  </div>
              </div>
          ) : (
            <p className="text-[var(--ui-text)] text-base leading-relaxed cursor-text whitespace-pre-wrap" onDoubleClick={() => {
                setEditedText(sourceText)
                setIsEditing(true)
            }}>{sourceText}</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {results.map((result, index) => (
          <div key={index} className="bg-[var(--ui-surface)] rounded-xl p-4 border border-[var(--ui-border)] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {result.icon && (
                  <div className="w-5 h-5 rounded-full bg-[var(--ui-text)] text-[var(--ui-accent)] flex items-center justify-center text-xs font-bold">
                    {result.icon[0]}
                  </div>
                )}
                <span className={`text-sm font-semibold ${result.error ? 'text-red-500 dark:text-red-400' : 'text-[var(--ui-text)]'}`}>{result.name}</span>
              </div>
              {!result.error && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTTS(result.name)}
                    className={`text-[var(--ui-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer ${ttsPlaying === result.name ? 'text-[var(--ui-accent)]' : ''}`}
                    title="Play text-to-speech"
                  >
                    {ttsPlaying === result.name ? (
                      <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891 1.077 1.337 1.707 1.707L5.586 15z" clipRule="evenodd" fillRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891 1.077 1.337 1.707 1.707L5.586 15z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleCopy(result.text, result.name)}
                    className="p-1 rounded hover:bg-[var(--ui-surface-2)] text-[var(--ui-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {copiedService === result.name ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
            {result.error ? (
              <p className="text-red-500 dark:text-red-400 text-sm">{result.error}</p>
            ) : (
              <p className="text-[var(--ui-text)] text-base leading-relaxed whitespace-pre-wrap">{result.text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
