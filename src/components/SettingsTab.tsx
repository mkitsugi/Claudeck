import { Check } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'
import { themeList, type ThemeId } from '../themes'

export function SettingsTab() {
  const { currentThemeId, setTheme } = useThemeStore()

  return (
    <div className="settings-tab">
      <div className="settings-section">
        <h3 className="settings-section-title">テーマ</h3>
        <div className="theme-list">
          {themeList.map((theme) => (
            <button
              key={theme.id}
              className={`theme-option ${currentThemeId === theme.id ? 'active' : ''}`}
              onClick={() => setTheme(theme.id as ThemeId)}
            >
              <div className="theme-preview">
                <div
                  className="theme-preview-swatch"
                  style={{
                    background: theme.colors['bg-primary'],
                    borderColor: theme.colors['accent-primary'],
                  }}
                >
                  <div
                    className="theme-preview-accent"
                    style={{ background: theme.colors['accent-primary'] }}
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
          ))}
        </div>
      </div>
    </div>
  )
}
