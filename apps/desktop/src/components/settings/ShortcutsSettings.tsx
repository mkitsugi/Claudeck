import { useState, useEffect } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { DEFAULT_SHORTCUT_SETTINGS } from '../../types'
import { ShortcutInput } from './ShortcutInput'
import type { ShortcutSettings as ShortcutSettingsType } from '../../types'

export function ShortcutsSettings() {
  const { shortcuts, updateShortcuts } = useSettingsStore()
  const [localShortcuts, setLocalShortcuts] = useState<ShortcutSettingsType>(shortcuts)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setLocalShortcuts(shortcuts)
  }, [shortcuts])

  const handleChange = (key: keyof ShortcutSettingsType, value: string) => {
    setLocalShortcuts((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  const hasChanges = JSON.stringify(localShortcuts) !== JSON.stringify(shortcuts)

  const handleApply = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const result = await updateShortcuts(localShortcuts)
      if (!result.success) {
        setError(result.error || 'ショートカットの更新に失敗しました')
      }
    } catch (err) {
      setError('ショートカットの更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="settings-content-inner">
      <div className="settings-section">
        <h3 className="settings-section-title">グローバルショートカット</h3>
        <p className="settings-description">アプリがフォーカスされていなくても動作します。</p>

        <ShortcutInput
          label="ドロップダウンターミナル"
          description="クイックアクセスターミナルの表示/非表示"
          value={localShortcuts.toggleDropdown}
          defaultValue={DEFAULT_SHORTCUT_SETTINGS.toggleDropdown}
          onChange={(v) => handleChange('toggleDropdown', v)}
          isGlobal
        />
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">アプリ内ショートカット</h3>
        <p className="settings-description">アプリがフォーカスされているときに動作します。</p>

        <ShortcutInput
          label="コマンドパレット"
          description="コマンドパレットを開く"
          value={localShortcuts.commandPalette}
          defaultValue={DEFAULT_SHORTCUT_SETTINGS.commandPalette}
          onChange={(v) => handleChange('commandPalette', v)}
        />

        <ShortcutInput
          label="コマンド履歴"
          description="コマンド履歴を表示"
          value={localShortcuts.commandHistory}
          defaultValue={DEFAULT_SHORTCUT_SETTINGS.commandHistory}
          onChange={(v) => handleChange('commandHistory', v)}
        />

        <ShortcutInput
          label="サイドバー"
          description="サイドバーの表示/非表示"
          value={localShortcuts.toggleSidebar}
          defaultValue={DEFAULT_SHORTCUT_SETTINGS.toggleSidebar}
          onChange={(v) => handleChange('toggleSidebar', v)}
        />
      </div>

      {error && <div className="settings-error">{error}</div>}

      {hasChanges && (
        <button className="settings-apply-btn" onClick={handleApply} disabled={isSaving}>
          {isSaving ? '適用中...' : '適用'}
        </button>
      )}
    </div>
  )
}
