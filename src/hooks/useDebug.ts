import { useState, useEffect, useCallback } from 'react'

export function useDebug() {
  const [debugLog, setDebugLog] = useState<string[]>([])

  const addDebugLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLog(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 10))
  }, [])

  const clearDebugLog = useCallback(() => {
    setDebugLog([])
  }, [])

  useEffect(() => {
    const handleDebugLog = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail) {
        addDebugLog(customEvent.detail)
      }
    }
    window.addEventListener('debug-log', handleDebugLog)
    return () => {
      window.removeEventListener('debug-log', handleDebugLog)
    }
  }, [addDebugLog])

  return { debugLog, addDebugLog, clearDebugLog }
}
