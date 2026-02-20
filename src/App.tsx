import { useState, useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useSettingsStore } from './stores/settingsStore'
import Sidebar from './components/Sidebar'
import Settings from './components/Settings'
import InputTranslation from './components/InputTranslation'
import SelectTranslation from './components/SelectTranslation'
// ScreenshotTranslation moved to separate window, import removed
import History from './components/History'
import Favorites from './components/Favorites'

function App() {
  const [activeTab, setActiveTab] = useState('translate')
  const [translationText, setTranslationText] = useState('')
  const [ocrMeta, setOcrMeta] = useState<{ confidence: number; language?: string } | null>(null)
  
  const {
    loaded: settingsLoaded,
    loadSettings,
    darkMode,
    themePreset,
    themePreview,
    hotkeys,
    debugOpen,
    windowSize,
    windowPosition,
    windowMaximized,
    setThemePreset,
    setDebugOpen,
    setWindowSize,
    setWindowPosition,
    setWindowMaximized
  } = useSettingsStore()
  const [lastShortcut, setLastShortcut] = useState<string>('')
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [hotkeysRegistered, setHotkeysRegistered] = useState(false)
  const ignoreWindowPersistRef = useRef(false)
  const restoredWindowStateRef = useRef(false)

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
    if (!themePreview) {
      document.documentElement.setAttribute('data-theme', themePreset || 'gold')
    }
  }, [themePreset, themePreview])

  useEffect(() => {
    if (!settingsLoaded || restoredWindowStateRef.current) return
    // @ts-ignore
    if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) return

    import('@tauri-apps/api/window').then(async (m) => {
      const win = m.getCurrentWindow()
      try {
        restoredWindowStateRef.current = true
        if (windowPosition && typeof windowPosition.x === 'number' && typeof windowPosition.y === 'number') {
          await win.setPosition(new m.PhysicalPosition(windowPosition.x, windowPosition.y))
        }
        if (windowSize && windowSize.width > 0 && windowSize.height > 0) {
          await win.setSize(new m.PhysicalSize(windowSize.width, windowSize.height))
        }
        if (windowMaximized) {
          await win.maximize()
        }
      } catch (error) {
        console.error('Failed to restore window state:', error)
      }
    })
  }, [settingsLoaded, windowSize, windowPosition, windowMaximized])

  useEffect(() => {
    // @ts-ignore
    if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) return

    let unlistenResize: null | (() => void) = null
    let unlistenMove: null | (() => void) = null

    import('@tauri-apps/api/window').then(async (m) => {
      const win = m.getCurrentWindow()
      unlistenResize = await win.onResized(async () => {
        try {
          if (ignoreWindowPersistRef.current) return
          const isMax = await win.isMaximized()
          const isMin = await win.isMinimized()
          setWindowMaximized(isMax)
          if (!isMax && !isMin) {
            const size = await win.innerSize()
            setWindowSize({ width: size.width, height: size.height })
          }
        } catch (error) {
          console.error('Failed to persist window size:', error)
        }
      })
      unlistenMove = await win.onMoved(async () => {
        try {
          if (ignoreWindowPersistRef.current) return
          const isMax = await win.isMaximized()
          const isMin = await win.isMinimized()
          if (isMax || isMin) return
          const pos = await win.outerPosition()
          setWindowPosition({ x: pos.x, y: pos.y })
        } catch (error) {
          console.error('Failed to persist window position:', error)
        }
      })
    })

    return () => {
      if (unlistenResize) unlistenResize()
      if (unlistenMove) unlistenMove()
    }
  }, [setWindowSize, setWindowPosition, setWindowMaximized])

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
    const handleOcrCaptureState = (e: Event) => {
      const customEvent = e as CustomEvent;
      ignoreWindowPersistRef.current = Boolean(customEvent.detail);
    };
    window.addEventListener('ocr-capture-active', handleOcrCaptureState);
    return () => {
      window.removeEventListener('ocr-capture-active', handleOcrCaptureState);
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
      setOcrMeta(null);
      
      // Dispatch custom event for InputTranslation component
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger-select-translation', { detail: text }));
      }, 100);
    }));

    // Handle internal translation requests (from OCR or in-app selection)
    // This is for DOM events
    const handleRequestTranslation = (event: Event) => {
      const customEvent = event as CustomEvent;
      const payload = customEvent.detail;
      const text = typeof payload === 'string' ? payload : payload?.text;
      const incomingOcr = typeof payload === 'string' ? null : payload?.ocrInfo;
      const autoShow = typeof payload === 'string' ? true : payload?.autoShow ?? true;
      if (text) {
        addDebugLog(`Received request-translation (DOM): "${text.substring(0, 50)}..."`);
        setTranslationText(text);
        setOcrMeta(incomingOcr || null);
        
        // Dispatch to ensure InputTranslation updates
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('trigger-select-translation', { detail: text }));
        }, 100);

        if (autoShow) {
          setActiveTab('translate');
          // Focus window
          import('@tauri-apps/api/window').then(m => {
            const appWindow = m.getCurrentWindow();
            // Need to unminimize if minimized
            appWindow.unminimize();
            appWindow.show();
            appWindow.setFocus();
            // Force focus to front if needed
            appWindow.setAlwaysOnTop(true);
            setTimeout(() => appWindow.setAlwaysOnTop(false), 500);
          });
        }
      }
    };
    window.addEventListener('request-translation', handleRequestTranslation);

    // Listen for 'request-translation' from Tauri event (sent by Overlay window via backend)
    listeners.push(listen('request-translation', (event) => {
      try {
        const rawPayload = event.payload as string;
        // The payload from backend is a JSON string
        const payload = JSON.parse(rawPayload);
        
        console.log('Received request-translation from Tauri event:', payload);
        addDebugLog(`Received request-translation (Tauri): "${payload.text?.substring(0, 50)}..."`);

        // Forward to our internal handler by dispatching a DOM event
        window.dispatchEvent(new CustomEvent('request-translation', { detail: payload }));
      } catch (e) {
        console.error('Failed to parse request-translation payload:', e);
        addDebugLog(`Error parsing request-translation: ${e}`);
      }
    }));

    // Screenshot OCR event
    // Note: This is now primarily handled by the overlay window, but we keep this listener
    // in case the overlay fails or for fallback behavior if needed.
    // However, if overlay handles it, we don't want double handling.
    // Let's modify it to only log or handle if specifically targeted at main.
    listeners.push(listen('trigger-screenshot', () => {
      addDebugLog('Received trigger-screenshot event (Main Window)');
      console.log('Screenshot OCR event received in Main Window');
      
      // If we are in the main window, we generally DON'T want to trigger the old flow
      // unless we are in a fallback mode. 
      // For now, let's just log it. The overlay window should handle the actual capture.
    }));

    // Silent OCR event
    listeners.push(listen('trigger-silent-ocr', () => {
      addDebugLog('Received trigger-silent-ocr event (Main Window)');
      console.log('Silent OCR event received in Main Window');
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
      window.removeEventListener('request-translation', handleRequestTranslation);
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
        return <InputTranslation initialText={translationText} initialOcrInfo={ocrMeta || undefined} />
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
    <div className="flex h-screen overflow-hidden font-sans selection:bg-[var(--ui-accent)]/30 bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onThemeToggle={() => setThemePreset(themePreset === 'gold' ? 'stone' : 'gold')}
        themeLabel={themePreset === 'gold' ? 'Warm Stone' : 'Black Gold'}
        themeIsGold={themePreset === 'gold'}
      />
      
      <main className="flex-1 relative flex flex-col min-w-0">
        {/* Title Bar Region - Draggable */}
        <div data-tauri-drag-region className="h-8 w-full flex-shrink-0" />
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden relative">
           {renderContent()}
        </div>

        {/* Global Overlays */}
        <SelectTranslation />
        {/* ScreenshotTranslation moved to separate window */}

        {/* Debug Info Overlay */}
        {!debugOpen ? (
          <button
            className="fixed bottom-4 right-4 z-[9999] rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] px-3 py-2 text-xs shadow-lg hover:bg-[var(--ui-surface-2)] transition-colors cursor-pointer"
            onClick={() => setDebugOpen(true)}
          >
            Debug
          </button>
        ) : (
          <div className="fixed bottom-4 right-4 bg-[var(--ui-surface-2)] text-[var(--ui-text)] p-3 rounded text-xs z-[9999] max-w-sm break-words shadow-lg border border-[var(--ui-border)]">
            <div className="flex items-center justify-between gap-2 mb-1 border-b border-[var(--ui-border)] pb-1">
              <div className="font-bold">Debug Info</div>
              <button
                className="rounded px-2 py-1 text-[var(--ui-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface)] transition-colors cursor-pointer"
                onClick={() => setDebugOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mb-2">
              Last Shortcut: <span className="text-[var(--ui-accent)]">{lastShortcut || 'None'}</span>
            </div>
            <div className="mb-2 max-h-32 overflow-y-auto">
              <div className="font-semibold text-[var(--ui-muted)]">Recent Logs:</div>
              {debugLog.map((log, i) => (
                <div key={i} className="whitespace-nowrap overflow-hidden text-ellipsis">{log}</div>
              ))}
            </div>
            <div className="mt-2 border-t border-[var(--ui-border)] pt-2">
              <div className="font-semibold text-[var(--ui-muted)] mb-1">Loaded Hotkeys:</div>
              <div className="max-h-24 overflow-y-auto">
                {hotkeys.map(h => (
                  <div key={h.action} className="flex justify-between gap-2">
                    <span>{h.action}:</span>
                    <span className="text-[var(--ui-accent)] font-mono">{h.shortcut}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 flex gap-2 flex-wrap">
              <button 
                className="bg-[var(--ui-accent)] text-[#171717] px-2 py-1 rounded hover:bg-[var(--ui-accent-strong)] text-xs cursor-pointer"
                onClick={() => window.dispatchEvent(new CustomEvent('trigger-screenshot-ocr'))}
              >
                Test OCR
              </button>
              <button 
                className="bg-[var(--ui-surface)] text-[var(--ui-text)] px-2 py-1 rounded hover:bg-[var(--ui-surface-2)] text-xs cursor-pointer"
                onClick={() => window.dispatchEvent(new CustomEvent('trigger-select-translation'))}
              >
                Test Select
              </button>
              <button 
                className="bg-[var(--ui-surface)] text-[var(--ui-text)] px-2 py-1 rounded hover:bg-[var(--ui-surface-2)] text-xs cursor-pointer"
                onClick={() => window.dispatchEvent(new CustomEvent('focus-translation-input'))}
              >
                Test Focus
              </button>
              <button 
                className="bg-red-600 px-2 py-1 rounded hover:bg-red-700 text-xs cursor-pointer"
                onClick={() => setDebugLog([])}
              >
                Clear Logs
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
