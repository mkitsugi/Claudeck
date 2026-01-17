import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { SettingsNav, type SettingsSection } from './SettingsNav'
import { AppearanceSettings } from './AppearanceSettings'
import { DropdownSettings } from './DropdownSettings'
import { ShortcutsSettings } from './ShortcutsSettings'
import { useSettingsStore } from '../../stores/settingsStore'

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance')
  const { initialize } = useSettingsStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="settings-modal-overlay" onClick={handleOverlayClick}>
      <div className="settings-modal-v2">
        <div className="settings-modal-header">
          <h2>設定</h2>
          <button className="settings-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="settings-modal-body">
          <SettingsNav active={activeSection} onChange={setActiveSection} />
          <div className="settings-content">
            {activeSection === 'appearance' && <AppearanceSettings />}
            {activeSection === 'dropdown' && <DropdownSettings />}
            {activeSection === 'shortcuts' && <ShortcutsSettings />}
          </div>
        </div>
      </div>
    </div>
  )
}
