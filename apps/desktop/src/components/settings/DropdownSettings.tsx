import { useState, useEffect, useRef, useCallback } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'

export function DropdownSettings() {
  const { dropdown, updateDropdown } = useSettingsStore()
  const [opacity, setOpacity] = useState(dropdown.opacity)
  const [blur, setBlur] = useState(dropdown.blur)
  const originalSettings = useRef({ opacity: dropdown.opacity, blur: dropdown.blur })

  useEffect(() => {
    setOpacity(dropdown.opacity)
    setBlur(dropdown.blur)
    originalSettings.current = { opacity: dropdown.opacity, blur: dropdown.blur }
  }, [dropdown])

  // Debounced preview - applies to actual dropdown window in real-time
  const previewStyle = useCallback((opts: { opacity: number; blur: number }) => {
    window.electronAPI.previewDropdownStyle(opts)
  }, [])

  const handleOpacityChange = (value: number) => {
    setOpacity(value)
    previewStyle({ opacity: value, blur })
  }

  const handleBlurChange = (value: number) => {
    setBlur(value)
    previewStyle({ opacity, blur: value })
  }

  const handleApply = async () => {
    await updateDropdown({ opacity, blur })
    originalSettings.current = { opacity, blur }
  }

  const handleReset = () => {
    setOpacity(originalSettings.current.opacity)
    setBlur(originalSettings.current.blur)
    previewStyle(originalSettings.current)
  }

  const hasChanges = opacity !== originalSettings.current.opacity || blur !== originalSettings.current.blur

  return (
    <div className="settings-content-inner">
      <div className="settings-section">
        <h3 className="settings-section-title">ドロップダウンターミナル</h3>
        <p className="settings-description">
          Cmd+. で表示するドロップダウンターミナルの外観を設定します。
          スライダーを動かすと実際のウィンドウでリアルタイムに確認できます。
        </p>

        <div className="setting-item">
          <div className="setting-item-header">
            <label>不透明度</label>
            <span className="setting-value">{opacity}%</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            value={opacity}
            onChange={(e) => handleOpacityChange(Number(e.target.value))}
            className="setting-slider"
          />
        </div>

        <div className="setting-item">
          <div className="setting-item-header">
            <label>ブラー</label>
            <span className="setting-value">{blur}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={50}
            value={blur}
            onChange={(e) => handleBlurChange(Number(e.target.value))}
            className="setting-slider"
          />
        </div>

        <div className="dropdown-preview-container">
          <label className="preview-label">プレビュー（実際のドロップダウンにも反映されます）</label>
          <div
            className="dropdown-preview"
            style={{
              background: `rgba(30, 30, 30, ${opacity / 100})`,
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
            }}
          >
            <div className="preview-header">
              <span>~/projects/my-app</span>
              <span className="preview-hint">Cmd+. to hide</span>
            </div>
            <div className="preview-content">
              <span className="preview-prompt">$</span> npm run dev
            </div>
          </div>
        </div>

        {hasChanges && (
          <div className="settings-actions">
            <button className="settings-reset-btn" onClick={handleReset}>
              リセット
            </button>
            <button className="settings-apply-btn" onClick={handleApply}>
              適用
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
