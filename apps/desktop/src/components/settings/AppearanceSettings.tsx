import { Check, Sun, Moon, Monitor } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'
import { themeList, type ThemeId } from '@claudeck/shared/themes'
import type { ThemeMode } from '@claudeck/shared/themes'

const modeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'ライト', icon: Sun },
  { value: 'dark', label: 'ダーク', icon: Moon },
  { value: 'system', label: 'システム', icon: Monitor },
]

export function AppearanceSettings() {
  const { currentThemeId, mode, resolvedMode, setTheme, setMode } = useThemeStore()

  return (
    <div className="settings-content-inner">
      <div className="settings-section">
        <h3 className="settings-section-title">外観モード</h3>
        <div className="mode-toggle">
          {modeOptions.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.value}
                className={`mode-option ${mode === option.value ? 'active' : ''}`}
                onClick={() => setMode(option.value)}
              >
                <Icon size={16} />
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">テーマ</h3>
        <div className="theme-list">
          {themeList.map((theme) => {
            const colors = theme[resolvedMode]
            return (
              <button
                key={theme.id}
                className={`theme-option ${currentThemeId === theme.id ? 'active' : ''}`}
                onClick={() => setTheme(theme.id as ThemeId)}
              >
                <div className="theme-preview">
                  <div
                    className="theme-preview-swatch"
                    style={{
                      background: colors['bg-primary'],
                      borderColor: colors['accent-primary'],
                    }}
                  >
                    <div
                      className="theme-preview-accent"
                      style={{ background: colors['accent-primary'] }}
                    />
                  </div>
                </div>
                <div className="theme-info">
                  <span className="theme-name">{theme.name}</span>
                  <span className="theme-description">{theme.description}</span>
                </div>
                {currentThemeId === theme.id && (
                  <div className="theme-check">
                    <Check size={14} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
