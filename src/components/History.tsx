import { useState } from 'react'
import { useHistoryStore, searchHistory } from '../stores/historyStore'

export default function History({ onClose }: { onClose: () => void }) {
  const { history, deleteHistoryItem, clearHistory, toggleFavorite } = useHistoryStore()
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

  const handleReTranslate = (item: any) => {
    console.log('Re-translate:', item)
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden m-4 flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold">History</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-gray-700 flex items-center justify-center flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex-1 overflow-auto p-4">
          {filteredHistory.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <p className="text-sm">No history found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-base break-words">{item.sourceText}</p>
                      <p className="text-gray-300 text-sm mt-1 break-words">{item.targetText}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        className={`p-1 rounded hover:bg-gray-500 transition-colors ${
                          item.isFavorite ? 'text-yellow-500' : 'text-gray-400'
                        }`}
                        title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
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
                        onClick={() => handleReTranslate(item)}
                        className="p-1 rounded hover:bg-gray-500 text-gray-400 hover:text-white transition-colors"
                        title="Re-translate"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 15m-15.356-2A8.001 8.001 0 004.242-15m0 0v5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 rounded hover:bg-gray-500 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{formatDate(item.timestamp)}</span>
                    <span>{item.services.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-gray-700 flex justify-between items-center flex-shrink-0">
          <button
            onClick={handleClearAll}
            className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  )
}
