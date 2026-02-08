import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import TranslationResult from './TranslationResult'
import { useSettingsStore } from '../stores/settingsStore'
import { useHistoryStore } from '../stores/historyStore'
import { v4 as uuidv4 } from 'uuid'

import { en, zh } from '../locales'

interface TranslationService {
  name: string
  text: string
}

interface TranslationResponse {
  results: TranslationService[]
}

export default function InputTranslation({ initialText }: { initialText?: string }) {
  const [inputText, setInputText] = useState(initialText || '')
  const [results, setResults] = useState<TranslationService[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Handle initial text and external events
  useEffect(() => {
    if (initialText) {
      setInputText(initialText)
      // Auto-trigger translation for shortcut-triggered text
      setTimeout(() => {
        handleTranslate()
      }, 300)
    }
  }, [initialText])

  // Handle external events
  useEffect(() => {
    const handleSelectTranslation = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const text = customEvent.detail;
        console.log('Select translation event received:', text);
        setInputText(text);
        setTimeout(() => {
          handleTranslate();
        }, 200);
      }
    };

    const handleFocusInput = () => {
      console.log('Focus input event received');
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    };

    window.addEventListener('trigger-select-translation', handleSelectTranslation);
    window.addEventListener('focus-translation-input', handleFocusInput);

    return () => {
      window.removeEventListener('trigger-select-translation', handleSelectTranslation);
      window.removeEventListener('focus-translation-input', handleFocusInput);
    };
  }, []);

  const { services, sourceLang: defaultSource, targetLang: defaultTarget, loaded, loadSettings, uiLanguage } = useSettingsStore()
  const { addToHistory } = useHistoryStore()
  const t = uiLanguage === 'zh' ? zh.translate : en.translate

  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('zh')

  useEffect(() => {
    if (!loaded) loadSettings()
  }, [loaded, loadSettings])

  useEffect(() => {
    if (loaded) {
      setSourceLang(defaultSource)
      setTargetLang(defaultTarget)
    }
  }, [loaded, defaultSource, defaultTarget])

  const detectLanguage = (text: string): string => {
    const chineseRegex = /[\u4e00-\u9fa5\u3400-\u4dbf]/
    if (chineseRegex.test(text)) {
      return 'zh'
    }
    return 'en'
  }

  const handleTranslate = async () => {
    if (!inputText.trim()) return

    setIsLoading(true)
    setHasSearched(true)

    // Check if running in a browser (where Tauri API is missing)
    // @ts-ignore
    if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) {
      alert('Tauri API not found. Please run this app using "npm run tauri:dev" or the built executable, not a standard browser.');
      setIsLoading(false);
      return;
    }

    try {
      const detected = sourceLang === 'auto' ? detectLanguage(inputText) : sourceLang
      const target = targetLang || (detected === 'zh' ? 'en' : 'zh')

      const enabledServices = services.filter(s => s.enabled)
      const serviceNames = enabledServices.map(s => s.name)

      const config: Record<string, any> = {}
      for (const s of enabledServices) {
        config[s.name.toLowerCase()] = {
          apiKey: s.apiKey,
          accessKeyId: s.accessKeyId,
          accessKeySecret: s.accessKeySecret,
          model: s.model
        }
      }

      console.log('Sending translation request:', {
        text: inputText,
        source_lang: detected,
        target_lang: target,
        services: serviceNames,
      });

      const response = await invoke<TranslationResponse>('translate', {
        request: {
          text: inputText,
          source_lang: detected,
          target_lang: target,
          services: serviceNames,
          config: config
        }
      })

      console.log('Translation results received:', response)
      setResults(response.results)

      // Add to history
      if (response.results.length > 0) {
        addToHistory({
          id: uuidv4(),
          sourceText: inputText,
          targetText: response.results.map(r => r.text).join(' '),
          sourceLang: detected,
          targetLang: target,
          services: response.results.map(r => r.name),
          timestamp: Date.now(),
          isFavorite: false
        })
      }
    } catch (error) {
      console.error('Translation error:', error)
      setResults([])
      const errorStr = String(error);
      if (errorStr.includes('API key') || errorStr.includes('access')) {
        alert('Translation Error: Please configure API keys in Settings > Services for the enabled translation services.');
      } else {
        alert('Translation Error: ' + errorStr);
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTranslate()
    }
  }

  const clearInput = () => {
    setInputText('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full gap-6">
        <div className="flex-shrink-0 space-y-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl opacity-30 group-hover:opacity-60 transition duration-500 blur"></div>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              className="relative w-full h-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 text-gray-900 dark:text-white resize-none focus:outline-none focus:border-blue-500/50 shadow-xl text-lg placeholder-gray-400 dark:placeholder-gray-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-4 bg-white/50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-200 dark:border-white/5 backdrop-blur-sm shadow-sm dark:shadow-none">
            <div className="flex-1">
              <select
                value={sourceLang}
                onChange={e => setSourceLang(e.target.value)}
                className="w-full bg-transparent text-gray-700 dark:text-gray-300 text-sm font-medium px-3 py-2 focus:outline-none cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <option value="auto">{t.autoDetect}</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </select>
            </div>

            <div className="w-px h-4 bg-gray-300 dark:bg-gray-700"></div>

            <button 
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={() => {
                const temp = sourceLang;
                setSourceLang(targetLang);
                setTargetLang(temp === 'auto' ? 'en' : temp);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>

            <div className="w-px h-4 bg-gray-300 dark:bg-gray-700"></div>

            <div className="flex-1">
              <select
                value={targetLang}
                onChange={e => setTargetLang(e.target.value)}
                className="w-full bg-transparent text-gray-700 dark:text-gray-300 text-sm font-medium px-3 py-2 focus:outline-none cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors text-right"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </select>
            </div>

            <button
              onClick={handleTranslate}
              disabled={isLoading || !inputText.trim()}
              className="ml-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                t.translateBtn
              )}
            </button>

            {inputText.trim() && (
              <button
                onClick={clearInput}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Clear input"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          {results.length > 0 ? (
            <div className="pb-6">
              <TranslationResult sourceText={inputText} results={results} />
            </div>
          ) : (!isLoading && hasSearched && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-4">
              <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{t.noResultHint}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}