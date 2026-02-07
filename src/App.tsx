import { useState, useEffect } from 'react'
import { useSettingsStore } from './stores/settingsStore'
import Sidebar from './components/Sidebar'
import Settings from './components/Settings'
import InputTranslation from './components/InputTranslation'
import SelectTranslation from './components/SelectTranslation'
import ScreenshotTranslation from './components/ScreenshotTranslation'
import History from './components/History'
import Favorites from './components/Favorites'

function App() {
  const [activeTab, setActiveTab] = useState('translate')
  
  const { loaded: settingsLoaded, loadSettings, darkMode } = useSettingsStore()

  useEffect(() => {
    if (!settingsLoaded) {
      loadSettings()
    }
  }, [settingsLoaded, loadSettings])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const renderContent = () => {
    switch (activeTab) {
      case 'translate':
        return <InputTranslation />
      case 'history':
        return <History onClose={() => setActiveTab('translate')} />
      case 'favorites':
        return <Favorites onClose={() => setActiveTab('translate')} />
      case 'settings':
        return <Settings onClose={() => setActiveTab('translate')} />
      default:
        return <InputTranslation />
    }
  }

  return (
    <div className={`flex h-screen overflow-hidden font-sans selection:bg-blue-500/30 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 relative flex flex-col min-w-0">
        {/* Title Bar Region - Draggable */}
        <div data-tauri-drag-region className="h-8 w-full flex-shrink-0" />
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden relative">
           {renderContent()}
        </div>

        {/* Global Overlays */}
        <SelectTranslation />
        <ScreenshotTranslation />
      </main>
    </div>
  )
}

export default App

