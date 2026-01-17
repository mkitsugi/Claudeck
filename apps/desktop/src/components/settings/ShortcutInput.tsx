import { useState, useCallback } from 'react'
import { RotateCcw } from 'lucide-react'

interface ShortcutInputProps {
  value: string
  defaultValue: string
  onChange: (value: string) => void
  label: string
  description?: string
  isGlobal?: boolean
}

function formatShortcutForDisplay(shortcut: string): string {
  return shortcut
    .replace('CommandOrControl', '⌘')
    .replace('Meta', '⌘')
    .replace('Control', '⌃')
    .replace('Alt', '⌥')
    .replace('Shift', '⇧')
    .replace(/\+/g, ' ')
}

function normalizeKey(key: string): string {
  if (key === ' ') return 'Space'
  if (key.length === 1) return key.toUpperCase()
  return key
}

export function ShortcutInput({
  value,
  defaultValue,
  onChange,
  label,
  description,
  isGlobal,
}: ShortcutInputProps) {
  const [isRecording, setIsRecording] = useState(false)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isRecording) return
      e.preventDefault()
      e.stopPropagation()

      const modifiers: string[] = []
      if (e.metaKey) modifiers.push(isGlobal ? 'CommandOrControl' : 'Meta')
      if (e.ctrlKey && !e.metaKey) modifiers.push('Control')
      if (e.altKey) modifiers.push('Alt')
      if (e.shiftKey) modifiers.push('Shift')

      const key = normalizeKey(e.key)

      // Ignore if only modifier key pressed
      if (['Meta', 'Control', 'Alt', 'Shift'].includes(key)) {
        return
      }

      if (modifiers.length > 0) {
        const shortcut = [...modifiers, key].join('+')
        onChange(shortcut)
        setIsRecording(false)
      }
    },
    [isRecording, onChange, isGlobal]
  )

  const handleClick = () => {
    setIsRecording(true)
  }

  const handleBlur = () => {
    setIsRecording(false)
  }

  const handleReset = () => {
    onChange(defaultValue)
  }

  const isModified = value !== defaultValue

  return (
    <div className="shortcut-input-row">
      <div className="shortcut-label-container">
        <span className="shortcut-label">{label}</span>
        {description && <span className="shortcut-description">{description}</span>}
      </div>
      <div className="shortcut-input-container">
        <div
          className={`shortcut-input ${isRecording ? 'recording' : ''}`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onBlur={handleBlur}
        >
          {isRecording ? 'キーを押してください...' : formatShortcutForDisplay(value)}
        </div>
        {isModified && (
          <button className="shortcut-reset-btn" onClick={handleReset} title="デフォルトに戻す">
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
