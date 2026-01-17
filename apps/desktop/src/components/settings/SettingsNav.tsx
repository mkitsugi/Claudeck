import { Palette, Monitor, Keyboard } from 'lucide-react'

export type SettingsSection = 'appearance' | 'dropdown' | 'shortcuts'

interface SettingsNavProps {
  active: SettingsSection
  onChange: (section: SettingsSection) => void
}

const navItems: { id: SettingsSection; label: string; icon: typeof Palette }[] = [
  { id: 'appearance', label: '外観', icon: Palette },
  { id: 'dropdown', label: 'ドロップダウン', icon: Monitor },
  { id: 'shortcuts', label: 'ショートカット', icon: Keyboard },
]

export function SettingsNav({ active, onChange }: SettingsNavProps) {
  return (
    <nav className="settings-nav">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            className={`settings-nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            <Icon size={16} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
