import { useState, memo, useCallback, useRef, useEffect } from 'react'
import { useHistoryStore, searchHistory } from '../stores/historyStore'
import { useSettingsStore } from '../stores/settingsStore'
import { en, zh } from '../locales'

interface HistoryItem {
  id: string
  sourceText: string
  targetText: string
  sourceLang: string
  targetLang: string
  services: string[]
  timestamp: number
  isFavorite: boolean
}

const ITEM_HEIGHT = 120
const VISIBLE_ITEMS = 10
const OVERSCAN = 3

const HistoryItemRow = memo(function HistoryItemRow({ 
  item, 
  onSelect, 
  onDelete, 
  onToggleFavorite, 
  formatDate,
  t,
  tCommon
}: { 
  item: HistoryItem
  onSelect: (item: HistoryItem) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
  formatDate: (timestamp: number) => string
  t: typeof zh.history
  tCommon: typeof zh.common
}) {
  return (
    <div className="px-4 pb-3" style={{ height: ITEM_HEIGHT }}>
      <div
        className="bg-[var(--ui-surface-2)] rounded-lg p-4 hover:bg-[var(--ui-surface)] transition-colors border border-[var(--ui-border)] h-full"
      >
        <div className="flex items-start justify-between mb-2 h-[48px]">
          <div 
            className="flex-1 min-w-0 cursor-pointer overflow-hidden" 
            onClick={() => onSelect(item)}
          >
            <p className="text-[var(--ui-text)] text-base break-words line-clamp-1">{item.sourceText}</p>
            <p className="text-[var(--ui-muted)] text-sm mt-1 break-words line-clamp-1">{item.targetText}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <button
              onClick={() => onToggleFavorite(item.id)}
              className={`p-1 rounded hover:bg-[var(--ui-surface)] transition-colors cursor-pointer ${
                item.isFavorite ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-muted)]'
              }`}
              title={item.isFavorite ? t.removeFromFavorites : t.addToFavorites}
            >
              <svg className="w-4 h-4" fill={item.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 2.348 0l1.65 3.376 3.7.538c1.024.149 1.433 1.407.698 2.126l-2.675 2.607.632 3.68c.176 1.024-.9 1.803-1.824 1.32L12 15.34l-3.328 1.752c-.924.483-2-.296-1.824-1.32l.632-3.68-2.675-2.607c-.735-.719-.326-1.977.698-2.126l3.7-.538 1.65-3.376z" />
              </svg>
            </button>
            <button
              onClick={() => onSelect(item)}
              className="p-1 rounded hover:bg-[var(--ui-surface)] text-[var(--ui-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer"
              title={t.reTranslate}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H3m1 0v5M20 12a8 8 0 01-8 8m0-8V4m0 8h8" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="p-1 rounded hover:bg-[var(--ui-surface)] text-[var(--ui-muted)] hover:text-red-500 transition-colors cursor-pointer"
              title={tCommon.delete}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-[var(--ui-muted)]">
          <span>{formatDate(item.timestamp)}</span>
          <span>{item.services.join(', ')}</span>
        </div>
      </div>
    </div>
  )
})

export default function History({ onClose, onSelect }: { onClose: () => void; onSelect: (text: string) => void }) {
  const { history, deleteHistoryItem, clearHistory, toggleFavorite } = useHistoryStore()
  const { uiLanguage } = useSettingsStore()
  const t = uiLanguage === 'zh' ? zh.history : en.history
  const tCommon = uiLanguage === 'zh' ? zh.common : en.common
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredHistory, setFilteredHistory] = useState(history)
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setFilteredHistory(history)
  }, [history])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      setFilteredHistory(searchHistory(query))
    } else {
      setFilteredHistory(history)
    }
  }, [history])

  const handleDelete = useCallback((id: string) => {
    deleteHistoryItem(id)
    setFilteredHistory((prev: HistoryItem[]) => prev.filter((item: HistoryItem) => item.id !== id))
  }, [deleteHistoryItem])

  const handleClearAll = useCallback(() => {
    clearHistory()
    setFilteredHistory([])
  }, [clearHistory])

  const handleSelect = useCallback((item: HistoryItem) => {
    onSelect(item.sourceText)
    onClose()
  }, [onSelect, onClose])

  const formatDate = useCallback((timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN)
  const endIndex = Math.min(
    filteredHistory.length,
    Math.floor(scrollTop / ITEM_HEIGHT) + VISIBLE_ITEMS + OVERSCAN
  )
  const visibleItems = filteredHistory.slice(startIndex, endIndex)
  const totalHeight = filteredHistory.length * ITEM_HEIGHT
  const offsetY = startIndex * ITEM_HEIGHT

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--ui-surface)] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden m-4 flex flex-col shadow-2xl border border-[var(--ui-border)]" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-[var(--ui-border)] flex-shrink-0">
          <h2 className="text-lg font-semibold text-[var(--ui-text)]">{t.title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-[var(--ui-surface-2)] flex items-center justify-center flex-shrink-0 text-[var(--ui-muted)] cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="p-4 border-b border-[var(--ui-border)] flex-shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-[var(--ui-surface-2)] border border-[var(--ui-border)] rounded-lg px-4 py-3 text-[var(--ui-text)] focus:outline-none focus:border-[var(--ui-accent)]"
          />
        </div>

        <div 
          ref={containerRef}
          className="flex-1 overflow-auto"
          onScroll={handleScroll}
        >
          {filteredHistory.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-[var(--ui-muted)]">
              <p className="text-sm">{t.noHistory}</p>
            </div>
          ) : (
            <div style={{ height: totalHeight, position: 'relative' }}>
              <div style={{ transform: `translateY(${offsetY}px)` }}>
                {visibleItems.map((item) => (
                  <HistoryItemRow
                    key={item.id}
                    item={item}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                    onToggleFavorite={toggleFavorite}
                    formatDate={formatDate}
                    t={t}
                    tCommon={tCommon}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-[var(--ui-border)] flex justify-between items-center flex-shrink-0">
          <span className="text-xs text-[var(--ui-muted)]">{filteredHistory.length} items</span>
          <div className="flex gap-2">
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              {t.clearAll}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--ui-surface-2)] hover:bg-[var(--ui-surface)] rounded-lg text-sm font-medium text-[var(--ui-text)] transition-colors cursor-pointer"
            >
              {tCommon.close}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
