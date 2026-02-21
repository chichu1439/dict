import { useState, useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'

interface UseEventListenersOptions {
  setActiveTab: (tab: string) => void
  setTranslationText: (text: string) => void
  setOcrMeta: (meta: { confidence: number; language?: string } | null) => void
  addDebugLog: (msg: string) => void
}

export function useEventListeners({
  setActiveTab,
  setTranslationText,
  setOcrMeta,
  addDebugLog
}: UseEventListenersOptions) {
  const [lastShortcut, setLastShortcut] = useState<string>('')

  useEffect(() => {
    console.log('Setting up Tauri event listeners...')
    addDebugLog('Setting up event listeners')

    const listeners: Promise<() => void>[] = []

    listeners.push(listen('selection-translation', (event) => {
      const text = event.payload as string
      addDebugLog(`Received selection-translation event: "${text.substring(0, 50)}..."`)
      console.log('Selection translation event received:', text)

      setActiveTab('translate')
      setTranslationText(text)
      setOcrMeta(null)

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger-select-translation', { detail: text }))
      }, 100)
    }))

    const handleRequestTranslation = (event: Event) => {
      const customEvent = event as CustomEvent
      const payload = customEvent.detail
      const text = typeof payload === 'string' ? payload : payload?.text
      const incomingOcr = typeof payload === 'string' ? null : payload?.ocrInfo
      const autoShow = typeof payload === 'string' ? true : payload?.autoShow ?? true
      if (text) {
        addDebugLog(`Received request-translation (DOM): "${text.substring(0, 50)}..."`)
        setTranslationText(text)
        setOcrMeta(incomingOcr || null)

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('trigger-select-translation', { detail: text }))
        }, 100)

        if (autoShow) {
          setActiveTab('translate')
          import('@tauri-apps/api/window').then(m => {
            const appWindow = m.getCurrentWindow()
            appWindow.unminimize()
            appWindow.show()
            appWindow.setFocus()
            appWindow.setAlwaysOnTop(true)
            setTimeout(() => appWindow.setAlwaysOnTop(false), 500)
          })
        }
      }
    }
    window.addEventListener('request-translation', handleRequestTranslation)

    listeners.push(listen('request-translation', (event) => {
      try {
        const rawPayload = event.payload as string
        const payload = JSON.parse(rawPayload)

        console.log('Received request-translation from Tauri event:', payload)
        addDebugLog(`Received request-translation (Tauri): "${payload.text?.substring(0, 50)}..."`)

        window.dispatchEvent(new CustomEvent('request-translation', { detail: payload }))
      } catch (e) {
        console.error('Failed to parse request-translation payload:', e)
        addDebugLog(`Error parsing request-translation: ${e}`)
      }
    }))

    listeners.push(listen('trigger-screenshot', () => {
      addDebugLog('Received trigger-screenshot event (Main Window)')
      console.log('Screenshot OCR event received in Main Window')
    }))

    listeners.push(listen('trigger-silent-ocr', () => {
      addDebugLog('Received trigger-silent-ocr event (Main Window)')
      console.log('Silent OCR event received in Main Window')
    }))

    listeners.push(listen('focus-input', () => {
      addDebugLog('Received focus-input event')
      console.log('Focus input event received')

      setActiveTab('translate')

      import('@tauri-apps/api/window').then(m => {
        m.getCurrentWindow().setFocus()
      })

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('focus-translation-input'))
      }, 100)
    }))

    listeners.push(listen('global-shortcut', (event) => {
      const shortcut = event.payload as string
      console.log('Global shortcut event received:', shortcut)
      addDebugLog(`Received global-shortcut: ${shortcut}`)
      setLastShortcut(shortcut)

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('unmatched-shortcut', { detail: shortcut }))
      }, 100)
    }))

    return () => {
      listeners.forEach(p => p.then(f => f()))
      window.removeEventListener('request-translation', handleRequestTranslation)
      addDebugLog('Event listeners cleaned up')
    }
  }, [setActiveTab, setTranslationText, setOcrMeta, addDebugLog])

  return { lastShortcut }
}
