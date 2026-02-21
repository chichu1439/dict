import { useEffect, useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

export function useHotkeys(addDebugLog: (msg: string) => void) {
  const { loaded: settingsLoaded, hotkeys } = useSettingsStore()
  const [hotkeysRegistered, setHotkeysRegistered] = useState(false)

  useEffect(() => {
    console.log('Hotkey registration check:', { settingsLoaded, hotkeysLength: hotkeys.length, hotkeysRegistered })

    if (settingsLoaded && hotkeys.length > 0 && !hotkeysRegistered) {
      console.log('Registering hotkeys:', hotkeys)
      addDebugLog(`Registering ${hotkeys.length} hotkeys`)

      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('register_hotkeys', { hotkeys })
          .then(() => {
            console.log('Hotkeys registered successfully')
            addDebugLog('Hotkeys registered successfully')
            setHotkeysRegistered(true)
          })
          .catch((error) => {
            console.error('Failed to register hotkeys:', error)
            addDebugLog(`Failed to register hotkeys: ${error}`)
            if (error.toString().includes('already registered')) {
              console.log('Hotkeys appear to be already registered, marking as registered')
              addDebugLog('Hotkeys already registered, skipping further attempts')
              setHotkeysRegistered(true)
            }
          })
      })
    }
  }, [settingsLoaded, hotkeys, hotkeysRegistered, addDebugLog])

  return { hotkeysRegistered, hotkeys }
}
