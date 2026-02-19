interface ThemeCardProps {
  preset: 'gold' | 'stone'
  title: string
  label: string
  isActive: boolean
  lightBg: string
  darkBg: string
  darkMode: boolean
  onClick: () => void
  onHover: () => void
  onLeave: () => void
}

export default function ThemeCard({
  preset,
  title,
  label,
  isActive,
  lightBg,
  darkBg,
  darkMode,
  onClick,
  onHover,
  onLeave,
}: ThemeCardProps) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`w-28 rounded-lg border px-2 py-2 text-left transition-all cursor-pointer ${
        isActive
          ? 'border-[var(--ui-accent)]'
          : 'border-[var(--ui-border)] hover:border-[var(--ui-accent)]/60 hover:shadow-[var(--ui-ring)]'
      }`}
      style={isActive ? { boxShadow: 'var(--ui-ring)' } : undefined}
      data-theme-card={preset}
    >
      <div
        className="h-14 w-full rounded-md border border-black/10"
        style={{
          background: darkMode ? darkBg : lightBg
        }}
      />
      <div className="mt-2 text-xs text-[var(--ui-text)]">{title}</div>
      <div className="mt-1 text-[10px] text-[var(--ui-muted)]/80">{label}</div>
    </button>
  )
}
