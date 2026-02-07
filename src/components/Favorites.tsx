import { useState } from 'react'
import { useHistoryStore } from '../stores/historyStore'
import { useSettingsStore } from '../stores/settingsStore'
import { en, zh } from '../locales'

export default function Favorites({ onClose }: { onClose: () => void }) {
  const { favorites, removeFromFavorites } = useHistoryStore()
  const { uiLanguage } = useSettingsStore()
  const t = uiLanguage === 'zh' ? zh.favorites : en.favorites
  const tCommon = uiLanguage === 'zh' ? zh.common : en.common
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const handleRemove = (id: string) => {
    removeFromFavorites(id)
    if (selectedItem?.id === id) {
      setSelectedItem(null)
    }
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden m-4 flex flex-col shadow-2xl">
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-400"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {favorites.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <p className="text-sm">{t.noFavorites}</p>
                <p className="text-xs mt-2">{t.addHint}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-transparent"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white text-base break-words">{item.sourceText}</p>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 break-words">{item.targetText}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-500 text-yellow-500 hover:text-yellow-400 transition-colors"
                        title={zh.history.removeFromFavorites}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.688 2.348L15 7.278l-6.5-4.375c-.586-.387-.972-.688-1.401-.358-1.282-.711-2.019-2.516L5.5 7.278l-6.5-4.375a.524.524 0 00-.698-.288L.828 2.405c-.358.586-.688.972-.688 1.401 0 .623.3 1.125.688 1.849l5.5 4.275c.586.387.972.688 1.401.358.586.688.972.688 1.401L8.95 15.658l-6.5 4.275c-.586.387-.972.688-1.401.358-.586.688-.972.688-1.401z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatDate(item.timestamp)}</span>
                    <span>{item.services.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm font-medium text-gray-900 dark:text-white transition-colors"
          >
            {tCommon.close}
          </button>
        </footer>
      </div>
    </div>
  )
}
