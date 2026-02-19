import { useState } from 'react'
import { useHistoryStore, searchHistory } from '../stores/historyStore'
import { useSettingsStore } from '../stores/settingsStore'
import { en, zh } from '../locales'

export default function History({ onClose, onSelect }: { onClose: () => void; onSelect: (text: string) => void }) {
  const { history, deleteHistoryItem, clearHistory, toggleFavorite } = useHistoryStore()
  const { uiLanguage } = useSettingsStore()
  const t = uiLanguage === 'zh' ? zh.history : en.history
  const tCommon = uiLanguage === 'zh' ? zh.common : en.common
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredHistory, setFilteredHistory] = useState(history)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      setFilteredHistory(searchHistory(query))
    } else {
      setFilteredHistory(history)
    }
  }

  const handleDelete = (id: string) => {
    deleteHistoryItem(id)
    setFilteredHistory((prev: any[]) => prev.filter((item: any) => item.id !== id))
  }

  const handleClearAll = () => {
    clearHistory()
    setFilteredHistory([])
  }

  const handleSelect = (item: any) => {
    onSelect(item.sourceText)
    onClose()
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--ui-surface)] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden m-4 flex flex-col shadow-2xl border border-[var(--ui-border)]">
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

        <div className="flex-1 overflow-auto p-4">
          {filteredHistory.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-[var(--ui-muted)]">
              <p className="text-sm">{t.noHistory}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-[var(--ui-surface-2)] rounded-lg p-4 hover:bg-[var(--ui-surface)] transition-colors border border-[var(--ui-border)]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div 
                      className="flex-1 min-w-0 cursor-pointer" 
                      onClick={() => handleSelect(item)}
                    >
                      <p className="text-[var(--ui-text)] text-base break-words">{item.sourceText}</p>
                      <p className="text-[var(--ui-muted)] text-sm mt-1 break-words">{item.targetText}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        className={`p-1 rounded hover:bg-[var(--ui-surface)] transition-colors cursor-pointer ${
                          item.isFavorite ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-muted)]'
                        }`}
                        title={item.isFavorite ? t.removeFromFavorites : t.addToFavorites}
                      >
                        <svg className="w-4 h-4" fill={item.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          {item.isFavorite ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.688 2.348L15 7.278l-6.5-4.375c-.586-.387-.972-.688-1.401-.358-1.282-.711-2.019-2.516L5.5 7.278l-6.5-4.375a.524.524 0 00-.698-.288L.828 2.405c-.358.586-.688.972-.688 1.401 0 .623.3 1.125.688 1.849l5.5 4.275c.586.387.972.688 1.401.358.586.688.972.688 1.401L8.95 15.658l-6.5 4.275c-.586.387-.972.688-1.401.358-.586.688-.972.688-1.401z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.688 2.348L15 7.278l-6.5-4.375c-.586-.387-.972-.688-1.401-.358-1.282-.711-2.019-2.516L5.5 7.278l-6.5-4.375a.524.524 0 00-.698-.288L.828 2.405c-.358.586-.688.972-.688 1.401 0 .623.3 1.125.688 1.849l5.5 4.275c.586.387.972.688 1.401.358.586.688-.972.688-1.401 0-.623-.3-1.125-.688-1.849L.326 8.658l5.5-4.275c.586-.387.972-.688 1.401.358-.586.688-.972.688-1.401z" />
                          )}
                        </svg>
                      </button>
                      <button
                        onClick={() => handleSelect(item)}
                        className="p-1 rounded hover:bg-[var(--ui-surface)] text-[var(--ui-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer"
                        title={t.reTranslate}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 15m-15.356-2A8.001 8.001 0 004.242-15m0 0v5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
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
              ))}
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-[var(--ui-border)] flex justify-between items-center flex-shrink-0">
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
        </footer>
      </div>
    </div>
  )
}
