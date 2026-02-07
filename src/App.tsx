import { useState, useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
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
  const [translationText, setTranslationText] = useState('')
  
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

  useEffect(() => {
    const unlisten = listen('global-shortcut', (event) => {
      const shortcut = event.payload as string;
      console.log('Shortcut received:', shortcut);
      
      // Match shortcuts based on tauri.conf.json configuration
      // Note: Modifiers order might vary, checking for inclusion
      if (shortcut.includes('A') && (shortcut.includes('Ctrl') || shortcut.includes('Command')) && shortcut.includes('Alt')) {
        // Input Translation: CmdOrCtrl+Alt+A
        setActiveTab('translate');
        // Bring window to front is handled by backend
      } else if (shortcut.includes('D') && (shortcut.includes('Ctrl') || shortcut.includes('Command')) && shortcut.includes('Alt')) {
        // Select Translation: CmdOrCtrl+Alt+D
        // Trigger select translation overlay or mode
        // For now, we don't have a separate tab for "select", maybe just log or switch to it if it exists
        // SelectTranslation component listens to selection events, but maybe we want to toggle it?
        // Current implementation of SelectTranslation seems to be always mounted and listening?
        // Let's assume it handles itself or we trigger something.
        console.log('Select Translation shortcut triggered');
      } else if (shortcut.includes('S') && (shortcut.includes('Ctrl') || shortcut.includes('Command')) && shortcut.includes('Alt')) {
         if (shortcut.includes('Shift')) {
           // Silent OCR: CmdOrCtrl+Shift+Alt+S
           // TODO: Trigger silent OCR
           console.log('Silent OCR shortcut triggered');
         } else {
           // Screenshot OCR: CmdOrCtrl+Alt+S
           // Trigger screenshot overlay
           // We might need to communicate with ScreenshotTranslation component
           window.dispatchEvent(new CustomEvent('trigger-screenshot-ocr'));
         }
      }
    });

    return () => {
      unlisten.then(f => f());
    }
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'translate':
        return <InputTranslation initialText={translationText} />
      case 'history':
        return <History 
          onClose={() => setActiveTab('translate')} 
          onSelect={(text) => {
            setTranslationText(text)
            setActiveTab('translate')
          }}
        />
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

