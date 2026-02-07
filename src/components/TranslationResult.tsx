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
}

export default function TranslationResult({ sourceText, results, isLoading }: TranslationResultProps) {
  const [copiedService, setCopiedService] = useState<string | null>(null)
  const [ttsPlaying, setTtsPlaying] = useState<string | null>(null)
  const { uiLanguage } = useSettingsStore()
  const t = uiLanguage === 'zh' ? zh.translate : en.translate

  const handleCopy = async (text: string, serviceName: string) => {
    await writeText(text)
    setCopiedService(serviceName)
    setTimeout(() => setCopiedService(null), 2000)
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
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t.translating}</p>
        </div>
      </div>
    )
  }

  if (!sourceText || results.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400 dark:text-gray-500 text-sm">{t.noResultHint}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {sourceText && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm dark:shadow-none border border-gray-200 dark:border-transparent">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">{t.sourceText}</span>
            <button
              onClick={() => handleCopy(sourceText, 'source')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
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
          <p className="text-gray-900 dark:text-white text-base leading-relaxed">{sourceText}</p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((result, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {result.icon && (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                    {result.icon[0]}
                  </div>
                )}
                <span className={`text-sm font-semibold ${result.error ? 'text-red-500 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>{result.name}</span>
              </div>
              {!result.error && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTTS(result.name)}
                    className={`text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors ${ttsPlaying === result.name ? 'text-blue-500' : ''}`}
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
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
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
              <p className="text-gray-900 dark:text-white text-base leading-relaxed">{result.text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
