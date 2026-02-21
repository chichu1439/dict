import { useEffect, useRef } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

export function useWindowState() {
  const {
    loaded: settingsLoaded,
    windowSize,
    windowPosition,
    windowMaximized,
    setWindowSize,
    setWindowPosition,
    setWindowMaximized
  } = useSettingsStore()

  const ignoreWindowPersistRef = useRef(false)
  const restoredWindowStateRef = useRef(false)

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
    const handleOcrCaptureState = (e: Event) => {
      const customEvent = e as CustomEvent
      ignoreWindowPersistRef.current = Boolean(customEvent.detail)
    }
    window.addEventListener('ocr-capture-active', handleOcrCaptureState)
    return () => {
      window.removeEventListener('ocr-capture-active', handleOcrCaptureState)
    }
  }, [])

  return { ignoreWindowPersistRef }
}
