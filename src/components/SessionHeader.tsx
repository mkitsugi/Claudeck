import { useEffect, useState } from 'react'
import { Folder, GitBranch, Globe, PanelLeft, Settings, X } from 'lucide-react'
import { isDropdownMode } from '../utils/isDropdownMode'
import { SettingsTab } from './SettingsTab'
import type { ProjectInfo } from '../types'

interface SessionHeaderProps {
  projectPath: string
  ports?: number[]
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>設定</h2>
          <button className="settings-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <SettingsTab />
      </div>
    </div>
  )
}

export function SessionHeader({ projectPath, ports = [], sidebarCollapsed, onToggleSidebar }: SessionHeaderProps) {
  const [info, setInfo] = useState<ProjectInfo | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (projectPath) {
      window.electronAPI.getProjectInfo(projectPath).then(setInfo)
    }
  }, [projectPath])

  if (!info) return null

  // Remove duplicates and sort ports
  const uniquePorts = [...new Set(ports)].sort((a, b) => a - b)

  const isDropdown = isDropdownMode()

  return (
    <>
      <div className={`session-header ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isDropdown ? 'dropdown-mode' : ''}`}>
        {!isDropdown && sidebarCollapsed && onToggleSidebar && (
          <button
            className="sidebar-open-btn"
            onClick={onToggleSidebar}
            title="サイドバーを開く"
          >
            <PanelLeft size={16} />
          </button>
        )}
        <span className="badge path-badge">
          <Folder size={12} />
          {info.relativePath}
        </span>
        {info.nodeVersion && (
          <span className="badge node-badge">
            {info.nodeVersion}
          </span>
        )}
        {info.gitBranch && (
          <span className="badge branch-badge">
            <GitBranch size={12} />
            {info.gitBranch}
          </span>
        )}
        {uniquePorts.length > 0 && (
          <span className="badge port-badge">
            <Globe size={12} />
            {uniquePorts.join(', ')}
          </span>
        )}
        <div className="session-header-spacer" />
        {!isDropdown && (
          <button
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            title="設定"
          >
            <Settings size={16} />
          </button>
        )}
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}
