import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import TranslationResult from './TranslationResult'

interface TranslationService {
  name: string
  text: string
}

export default function InputTranslation({ onClose }: { onClose: () => void }) {
  const [inputText, setInputText] = useState('')
  const [results, setResults] = useState<TranslationService[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('zh')

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

    try {
      const detected = sourceLang === 'auto' ? detectLanguage(inputText) : sourceLang
      const target = targetLang || (detected === 'zh' ? 'en' : 'zh')

      const response = await invoke<TranslationService[]>('translate', {
        text: inputText,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      handleTranslate()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl p-6 m-4" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Translate</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-gray-700 flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="space-y-4">
          <div>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter text to translate..."
              className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white resize-none focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-2">Source Language</label>
              <select
                value={sourceLang}
                onChange={e => setSourceLang(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="auto">Auto Detect</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-2">Target Language</label>
              <select
                value={targetLang}
                onChange={e => setTargetLang(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleTranslate}
            disabled={isLoading || !inputText.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Translating...' : 'Translate'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-4">
            <TranslationResult sourceText={inputText} results={results} />
          </div>
        )}
      </div>
    </div>
  )
}
