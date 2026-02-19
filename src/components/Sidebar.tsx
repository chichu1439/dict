import { useSettingsStore } from '../stores/settingsStore'
import { en, zh } from '../locales'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onThemeToggle: () => void
  themeLabel: string
  themeIsGold: boolean
}

export default function Sidebar({ activeTab, onTabChange, onThemeToggle, themeLabel, themeIsGold }: SidebarProps) {
  const { uiLanguage } = useSettingsStore()
  const t = uiLanguage === 'zh' ? zh.sidebar : en.sidebar

  const tabs = [
    { id: 'translate', icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129', label: t.translate },
    { id: 'history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: t.history },
    { id: 'favorites', icon: 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z', label: t.favorites },
    { id: 'settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', label: t.settings },
  ]

  return (
    <div className="w-[76px] h-full bg-[var(--ui-surface)] border-r border-[var(--ui-border)] flex flex-col items-center py-6 gap-6 z-20">
      <div className="w-10 h-10 rounded-xl bg-[var(--ui-text)] text-[var(--ui-accent)] flex items-center justify-center shadow-md shadow-black/10 mb-2">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      </div>

      <nav className="flex flex-col gap-3 w-full px-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 group relative cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[var(--ui-surface-2)] text-[var(--ui-text)] ring-1 ring-[var(--ui-accent)]'
                : 'text-[var(--ui-muted)] hover:bg-[var(--ui-surface-2)] hover:text-[var(--ui-text)]'
            }`}
            title={tab.label}
          >
            <svg className="w-6 h-6" fill={tab.id === 'favorites' && activeTab === tab.id ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
          </button>
        ))}
      </nav>

      <div className="mt-auto pb-4">
        <button
          onClick={onThemeToggle}
          className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 group relative cursor-pointer text-[var(--ui-muted)] hover:bg-[var(--ui-surface-2)] hover:text-[var(--ui-text)]"
          title={themeLabel}
        >
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--ui-accent)] shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
          {themeIsGold ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414 1.414M7.05 7.05 5.636 5.636" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
