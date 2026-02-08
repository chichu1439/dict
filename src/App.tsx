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
  
  const { loaded: settingsLoaded, loadSettings, darkMode, hotkeys } = useSettingsStore()
  const [lastShortcut, setLastShortcut] = useState<string>('')
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [hotkeysRegistered, setHotkeysRegistered] = useState(false)

  const addDebugLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 10));
  }

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
    const handleDebugLog = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        addDebugLog(customEvent.detail);
      }
    };
    window.addEventListener('debug-log', handleDebugLog);
    return () => {
      window.removeEventListener('debug-log', handleDebugLog);
    };
  }, []);

  useEffect(() => {
    console.log('Setting up Tauri event listeners...');
    addDebugLog('Setting up event listeners');
    
    const listeners: Promise<() => void>[] = [];

    // Selection translation event
    listeners.push(listen('selection-translation', (event) => {
      const text = event.payload as string;
      addDebugLog(`Received selection-translation event: "${text.substring(0, 50)}..."`);
      console.log('Selection translation event received:', text);
      
      // Focus the app and switch to translate tab
      setActiveTab('translate');
      setTranslationText(text);
      
      // Dispatch custom event for InputTranslation component
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger-select-translation', { detail: text }));
      }, 100);
    }));

    // Screenshot OCR event
    listeners.push(listen('trigger-screenshot', () => {
      addDebugLog('Received trigger-screenshot event');
      console.log('Screenshot OCR event received');
      
      // Show screenshot translation overlay
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger-screenshot-ocr'));
      }, 100);
    }));

    // Silent OCR event
    listeners.push(listen('trigger-silent-ocr', () => {
      addDebugLog('Received trigger-silent-ocr event');
      console.log('Silent OCR event received');
      
      // Show screenshot translation overlay
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger-silent-ocr'));
      }, 100);
    }));

    // Focus input event
    listeners.push(listen('focus-input', () => {
      addDebugLog('Received focus-input event');
      console.log('Focus input event received');
      
      setActiveTab('translate');
      
      // Focus window and input
      import('@tauri-apps/api/window').then(m => {
        m.getCurrentWindow().setFocus();
      });
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('focus-translation-input'));
      }, 100);
    }));

    // Global shortcut fallback event
    listeners.push(listen('global-shortcut', (event) => {
      const shortcut = event.payload as string;
      console.log('Global shortcut event received:', shortcut);
      addDebugLog(`Received global-shortcut: ${shortcut}`);
      setLastShortcut(shortcut);
      
      // Handle any unmatched shortcuts
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('unmatched-shortcut', { detail: shortcut }));
      }, 100);
    }));

    return () => {
      listeners.forEach(p => p.then(f => f()));
      addDebugLog('Event listeners cleaned up');
    }
  }, []);

  // Register hotkeys when settings are loaded - only once
  useEffect(() => {
    console.log('Hotkey registration check:', { settingsLoaded, hotkeysLength: hotkeys.length, hotkeysRegistered });
    
    if (settingsLoaded && hotkeys.length > 0 && !hotkeysRegistered) {
      console.log('Registering hotkeys:', hotkeys);
      addDebugLog(`Registering ${hotkeys.length} hotkeys`);
      
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('register_hotkeys', { hotkeys })
          .then(() => {
            console.log('Hotkeys registered successfully');
            addDebugLog('Hotkeys registered successfully');
            setHotkeysRegistered(true); // 标记为已注册
          })
          .catch((error) => {
            console.error('Failed to register hotkeys:', error);
            addDebugLog(`Failed to register hotkeys: ${error}`);
            // 如果是因为已经注册导致的错误，也标记为已注册
            if (error.toString().includes('already registered')) {
              console.log('Hotkeys appear to be already registered, marking as registered');
              addDebugLog('Hotkeys already registered, skipping further attempts');
              setHotkeysRegistered(true);
            }
          });
      });
    }
  }, [settingsLoaded, hotkeys, hotkeysRegistered]);

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

        {/* Debug Info Overlay - Improved */}
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded text-xs z-[9999] max-w-sm break-words shadow-lg border border-gray-700">
           <div className="font-bold mb-1 border-b border-gray-600 pb-1">Debug Info</div>
           <div className="mb-2">Last Shortcut: <span className="text-yellow-400">{lastShortcut || 'None'}</span></div>
           <div className="mb-2 max-h-32 overflow-y-auto">
             <div className="font-semibold text-gray-400">Recent Logs:</div>
             {debugLog.map((log, i) => (
               <div key={i} className="whitespace-nowrap overflow-hidden text-ellipsis">{log}</div>
             ))}
           </div>
           <div className="mt-2 border-t border-gray-600 pt-2">
             <div className="font-semibold text-gray-400 mb-1">Loaded Hotkeys:</div>
             <div className="max-h-24 overflow-y-auto">
                {hotkeys.map(h => (
                  <div key={h.action} className="flex justify-between gap-2">
                    <span>{h.action}:</span>
                    <span className="text-blue-300 font-mono">{h.shortcut}</span>
                  </div>
                ))}
             </div>
           </div>
           <div className="mt-2 flex gap-2 flex-wrap">
             <button 
               className="bg-blue-600 px-2 py-1 rounded hover:bg-blue-700 text-xs"
               onClick={() => window.dispatchEvent(new CustomEvent('trigger-screenshot-ocr'))}
             >
               Test OCR
             </button>
             <button 
               className="bg-green-600 px-2 py-1 rounded hover:bg-green-700 text-xs"
               onClick={() => window.dispatchEvent(new CustomEvent('trigger-select-translation'))}
             >
               Test Select
             </button>
             <button 
               className="bg-purple-600 px-2 py-1 rounded hover:bg-purple-700 text-xs"
               onClick={() => window.dispatchEvent(new CustomEvent('focus-translation-input'))}
             >
               Test Focus
             </button>
             <button 
               className="bg-red-600 px-2 py-1 rounded hover:bg-red-700 text-xs"
               onClick={() => setDebugLog([])}
             >
               Clear Logs
             </button>
           </div>
        </div>
      </main>
    </div>
  )
}

export default App