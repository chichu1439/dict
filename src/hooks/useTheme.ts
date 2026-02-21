import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

export function useTheme() {
  const { darkMode, themePreset, themePreview } = useSettingsStore()

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

  return { darkMode, themePreset, themePreview }
}
