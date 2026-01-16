import { useEffect, useCallback } from 'react'
import { create } from 'zustand'
import { SHORTCUTS, CATEGORY_LABELS, type ShortcutCategory } from '../config/shortcuts'

interface ShortcutOverlayState {
  isOpen: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useShortcutOverlayStore = create<ShortcutOverlayState>((set) => ({
  isOpen: false,
  setOpen: (open: boolean) => set({ isOpen: open }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))

const categories: ShortcutCategory[] = ['app', 'terminal', 'claudeck']

export function ShortcutOverlay() {
  const { isOpen, setOpen } = useShortcutOverlayStore()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setOpen(false)
      }
    },
    [isOpen, setOpen]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isOpen) return null

  const shortcutsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = SHORTCUTS.filter((s) => s.category === cat)
    return acc
  }, {} as Record<ShortcutCategory, typeof SHORTCUTS>)

  return (
    <div className="shortcut-overlay" onClick={() => setOpen(false)}>
      <div className="shortcut-card" onClick={(e) => e.stopPropagation()}>
        <div className="shortcut-header">
          <span className="shortcut-icon">⌨️</span>
          <h2>キーボードショートカット</h2>
        </div>

        <div className="shortcut-content">
          {categories.map((category) => (
            <div key={category} className="shortcut-section">
              <div className="shortcut-section-header">
                {CATEGORY_LABELS[category]}
              </div>
              {shortcutsByCategory[category].map((shortcut) => (
                <div key={shortcut.keys} className="shortcut-item">
                  <span className="shortcut-keys">{shortcut.keys}</span>
                  <span className="shortcut-desc">{shortcut.description}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="shortcut-footer">
          <span>esc で閉じる</span>
        </div>
      </div>
    </div>
  )
}
