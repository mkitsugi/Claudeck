import { useState, useEffect } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'

export function DropdownSettings() {
  const { dropdown, updateDropdown } = useSettingsStore()
  const [opacity, setOpacity] = useState(dropdown.opacity)
  const [blur, setBlur] = useState(dropdown.blur)

  useEffect(() => {
    setOpacity(dropdown.opacity)
    setBlur(dropdown.blur)
  }, [dropdown])

  const handleApply = async () => {
    await updateDropdown({ opacity, blur })
  }

  const hasChanges = opacity !== dropdown.opacity || blur !== dropdown.blur

  return (
    <div className="settings-content-inner">
      <div className="settings-section">
        <h3 className="settings-section-title">ドロップダウンターミナル</h3>
        <p className="settings-description">
          Cmd+. で表示するドロップダウンターミナルの外観を設定します。
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
            onChange={(e) => setOpacity(Number(e.target.value))}
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
            onChange={(e) => setBlur(Number(e.target.value))}
            className="setting-slider"
          />
        </div>

        <div className="dropdown-preview-container">
          <label className="preview-label">プレビュー</label>
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
          <button className="settings-apply-btn" onClick={handleApply}>
            適用
          </button>
        )}
      </div>
    </div>
  )
}
