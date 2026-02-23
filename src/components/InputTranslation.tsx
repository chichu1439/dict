import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import TranslationResult from './TranslationResult'
import { useSettingsStore } from '../stores/settingsStore'
import { useHistoryStore } from '../stores/historyStore'
import { useTranslationCache } from '../stores/translationCacheStore'
import { useRequestDedup } from '../stores/requestDedupStore'
import { v4 as uuidv4 } from 'uuid'

import { en, zh } from '../locales'

interface TranslationService {
  name: string
  text: string
  error?: string
  fromCache?: boolean
}

export default function InputTranslation({ initialText, initialOcrInfo }: { initialText?: string; initialOcrInfo?: { confidence: number; language?: string } }) {
  const [inputText, setInputText] = useState(initialText || '')
  const [results, setResults] = useState<TranslationService[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [ocrInfo, setOcrInfo] = useState<{ confidence: number; language?: string } | null>(initialOcrInfo || null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const currentRequestIdRef = useRef<string | null>(null)
  const resultsRef = useRef<TranslationService[]>([])
  const translationMetaRef = useRef<{ sourceLang: string; targetLang: string; text: string } | null>(null)

  const { services, sourceLang: defaultSource, targetLang: defaultTarget, loaded, loadSettings, uiLanguage } = useSettingsStore()
  const { addToHistory } = useHistoryStore()
  const { get: getCache, set: setCache } = useTranslationCache()
  const { isPending, addPending, removePending } = useRequestDedup()
  const t = uiLanguage === 'zh' ? zh.translate : en.translate

  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('zh')

  useEffect(() => {
    if (initialText) {
      setInputText(initialText)
      setOcrInfo(initialOcrInfo || null)
      setTimeout(() => {
        handleTranslate()
      }, 300)
    }
  }, [initialText, initialOcrInfo])

  useEffect(() => {
    const handleSelectTranslation = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail) {
        const text = customEvent.detail
        console.log('Select translation event received:', text)
        setInputText(text)
        setOcrInfo(null)
        setTimeout(() => {
          handleTranslate()
        }, 200)
      }
    }

    const handleFocusInput = () => {
      console.log('Focus input event received')
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    }

    window.addEventListener('trigger-select-translation', handleSelectTranslation)
    window.addEventListener('focus-translation-input', handleFocusInput)

    return () => {
      window.removeEventListener('trigger-select-translation', handleSelectTranslation)
      window.removeEventListener('focus-translation-input', handleFocusInput)
    }
  }, [])

  useEffect(() => {
    if (!loaded) loadSettings()
  }, [loaded, loadSettings])

  useEffect(() => {
    if (loaded) {
      setSourceLang(defaultSource)
      setTargetLang(defaultTarget)
    }
  }, [loaded, defaultSource, defaultTarget])

  useEffect(() => {
    const unlistenPromise = listen('translation-stream', (event) => {
      const payload = event.payload as {
        request_id: string
        service: string
        delta?: string
        text?: string
        error?: string
        done?: boolean
        all_done?: boolean
      }
      if (!payload || payload.request_id !== currentRequestIdRef.current) return

      if (payload.all_done) {
        setIsLoading(false)
        setHasSearched(true)
        const meta = translationMetaRef.current
        const finalResults = resultsRef.current
        if (meta && finalResults.length > 0) {
          const hasAnyText = finalResults.some(r => r.text && r.text.trim())
          if (hasAnyText) {
            addToHistory({
              id: uuidv4(),
              sourceText: meta.text,
              targetText: finalResults.map(r => r.text).join(' '),
              sourceLang: meta.sourceLang,
              targetLang: meta.targetLang,
              services: finalResults.map(r => r.name),
              timestamp: Date.now(),
              isFavorite: false
            })
          }
        }
        return
      }

      setResults(prev => {
        const next = [...prev]
        const index = next.findIndex(r => r.name.toLowerCase() === payload.service.toLowerCase())
        if (index === -1) {
          next.push({ name: payload.service, text: payload.text || payload.delta || '' })
        } else {
          const current = next[index]
          if (payload.error) {
            next[index] = { ...current, error: payload.error }
          } else if (payload.text) {
            next[index] = { ...current, text: payload.text }
            if (translationMetaRef.current) {
              setCache(
                translationMetaRef.current.text,
                translationMetaRef.current.sourceLang,
                translationMetaRef.current.targetLang,
                payload.service,
                { text: payload.text, timestamp: Date.now(), serviceName: payload.service }
              )
            }
          } else if (payload.delta) {
            next[index] = { ...current, text: (current.text || '') + payload.delta }
          }
        }
        resultsRef.current = next
        return next
      })
    })

    return () => {
      unlistenPromise.then(unlisten => unlisten())
    }
  }, [addToHistory, setCache])

  const detectLanguage = (text: string): string => {
    const chineseRegex = /[\u4e00-\u9fa5\u3400-\u4dbf]/
    if (chineseRegex.test(text)) {
      return 'zh'
    }
    return 'en'
  }

  const handleTranslate = async () => {
    if (!inputText.trim()) return

    // @ts-ignore
    if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) {
      alert('Tauri API not found. Please run this app using "npm run tauri:dev" or the built executable, not a standard browser.')
      return
    }

    try {
      const detected = sourceLang === 'auto' ? detectLanguage(inputText) : sourceLang
      const target = targetLang || (detected === 'zh' ? 'en' : 'zh')

      const enabledServices = services.filter(s => s.enabled)
      const serviceNames = enabledServices.map(s => s.name)
      
      if (isPending(inputText, detected, target, serviceNames)) {
        console.log('Request already pending, skipping duplicate')
        return
      }

      setIsLoading(true)
      setHasSearched(true)
      setResults([])

      const requestKey = addPending(inputText, detected, target, serviceNames)

      const config: Record<string, any> = {}
      for (const s of enabledServices) {
        config[s.name.toLowerCase()] = {
          apiKey: s.apiKey,
          secretKey: s.secretKey,
          accessKeyId: s.accessKeyId,
          accessKeySecret: s.accessKeySecret,
          model: s.model
        }
      }

      const requestId = uuidv4()
      currentRequestIdRef.current = requestId
      translationMetaRef.current = { sourceLang: detected, targetLang: target, text: inputText }

      const cachedResults: TranslationService[] = []
      const servicesToFetch: typeof enabledServices = []

      for (const service of enabledServices) {
        const cached = getCache(inputText, detected, target, service.name)
        if (cached) {
          cachedResults.push({ name: service.name, text: cached.text, fromCache: true })
        } else {
          servicesToFetch.push(service)
        }
      }

      const initialResults = enabledServices.map(s => {
        const cached = cachedResults.find(r => r.name === s.name)
        return cached || { name: s.name, text: '' }
      })
      setResults(initialResults)
      resultsRef.current = initialResults

      if (cachedResults.length > 0) {
        console.log(`Cache hits: ${cachedResults.length}/${enabledServices.length}`)
      }

      if (servicesToFetch.length === 0) {
        setIsLoading(false)
        setHasSearched(true)
        removePending(requestKey)
        if (cachedResults.length > 0) {
          addToHistory({
            id: uuidv4(),
            sourceText: inputText,
            targetText: cachedResults.map(r => r.text).join(' '),
            sourceLang: detected,
            targetLang: target,
            services: cachedResults.map(r => r.name),
            timestamp: Date.now(),
            isFavorite: false
          })
        }
        return
      }

      const serviceNamesToFetch = servicesToFetch.map(s => s.name)

      console.log('Sending translation request:', {
        text: inputText,
        source_lang: detected,
        target_lang: target,
        services: serviceNamesToFetch,
        cached: cachedResults.length
      })

      await invoke('translate_stream', {
        request: {
          text: inputText,
          source_lang: detected,
          target_lang: target,
          services: serviceNamesToFetch,
          config: config
        },
        requestId
      })
    } catch (error) {
      console.error('Translation error:', error)
      setResults([])
      const errorStr = String(error)
      if (errorStr.includes('API key') || errorStr.includes('access')) {
        alert('Translation Error: Please configure API keys in Settings > Services for the enabled translation services.')
      } else {
        alert('Translation Error: ' + errorStr)
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
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={e => {
                setInputText(e.target.value)
                if (ocrInfo) setOcrInfo(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              className="relative w-full h-32 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl px-5 py-4 text-[var(--ui-text)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] text-lg placeholder-neutral-400 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3 bg-[var(--ui-surface)] p-2 rounded-xl border border-[var(--ui-border)] shadow-sm">
            <div className="flex-1 min-w-[140px]">
              <select
                value={sourceLang}
                onChange={e => setSourceLang(e.target.value)}
                className="w-full h-10 bg-[var(--ui-surface-2)] text-[var(--ui-text)] text-sm font-medium px-3 py-2 border border-[var(--ui-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] cursor-pointer transition-colors"
              >
                <option value="auto">{t.autoDetect}</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </select>
            </div>

            <div className="w-px h-6 bg-[var(--ui-border)] shrink-0"></div>

            <button
              className="p-2 h-10 w-10 flex items-center justify-center rounded-lg hover:bg-[var(--ui-surface-2)] text-[var(--ui-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer shrink-0"
              onClick={() => {
                const temp = sourceLang
                setSourceLang(targetLang)
                setTargetLang(temp === 'auto' ? 'en' : temp)
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>

            <div className="w-px h-6 bg-[var(--ui-border)] shrink-0"></div>

            <div className="flex-1 min-w-[140px]">
              <select
                value={targetLang}
                onChange={e => setTargetLang(e.target.value)}
                className="w-full h-10 bg-[var(--ui-surface-2)] text-[var(--ui-text)] text-sm font-medium px-3 py-2 border border-[var(--ui-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]/30 focus:border-[var(--ui-accent)] cursor-pointer transition-colors text-right"
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
              className="ml-2 px-6 h-10 bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-strong)] disabled:bg-neutral-200 disabled:text-neutral-400 rounded-lg font-medium text-[#171717] shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-[#171717]/30 border-t-[#171717] rounded-full animate-spin" />
              )}
              {t.translateBtn}
            </button>

            {inputText.trim() && (
              <button
                onClick={clearInput}
                className="p-2 h-10 w-10 flex items-center justify-center rounded-lg hover:bg-[var(--ui-surface-2)] text-[var(--ui-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer shrink-0"
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
              <TranslationResult sourceText={inputText} results={results} ocrInfo={ocrInfo || undefined} />
            </div>
          ) : (!isLoading && hasSearched && (
            <div className="flex flex-col items-center justify-center h-full text-[var(--ui-muted)] gap-4">
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
