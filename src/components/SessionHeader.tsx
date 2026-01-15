import { useEffect, useState } from 'react'
import { Folder, GitBranch, Globe, PanelLeft, Settings, X, Loader2, CircleDot, MessageSquare } from 'lucide-react'
import { isDropdownMode } from '../utils/isDropdownMode'
import { SettingsTab } from './SettingsTab'
import { useClaudeStatusStore } from '../stores/claudeStatusStore'
import type { ProjectInfo } from '../types'
import type { ClaudeCodeStatus } from '../utils/claudeCodeDetector'

interface SessionHeaderProps {
  projectPath: string
  ports?: number[]
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
  activeSessionId?: string | null
}

// 状態に応じたラベルとアイコンを返す
function getStatusDisplay(status: ClaudeCodeStatus) {
  switch (status) {
    case 'processing':
      return {
        label: '処理中',
        icon: Loader2,
        className: 'status-badge status-processing',
      }
    case 'waiting-input':
      return {
        label: '入力待ち',
        icon: MessageSquare,
        className: 'status-badge status-waiting',
      }
    case 'idle':
    default:
      return {
        label: '待機中',
        icon: CircleDot,
        className: 'status-badge status-idle',
      }
  }
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

export function SessionHeader({ projectPath, ports = [], sidebarCollapsed, onToggleSidebar, activeSessionId }: SessionHeaderProps) {
  const [info, setInfo] = useState<ProjectInfo | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // アクティブセッションの状態を取得
  const status = useClaudeStatusStore((state) =>
    activeSessionId ? state.statuses[activeSessionId] || 'idle' : 'idle'
  )
  const statusDisplay = getStatusDisplay(status)
  const StatusIcon = statusDisplay.icon

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
        {activeSessionId && (
          <span className={`badge ${statusDisplay.className}`}>
            <StatusIcon size={12} className={status === 'processing' ? 'spinning' : ''} />
            {statusDisplay.label}
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
