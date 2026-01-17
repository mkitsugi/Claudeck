import { useEffect, useState } from 'react'
import { Folder, GitBranch, Globe, PanelLeft, Settings } from 'lucide-react'
import { isDropdownMode } from '../utils/isDropdownMode'
import { SettingsModal } from './settings'
import type { ProjectInfo } from '../types'

interface SessionHeaderProps {
  projectPath: string
  ports?: number[]
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
  sessionId?: string
}

export function SessionHeader({ projectPath, ports = [], sidebarCollapsed, onToggleSidebar, sessionId }: SessionHeaderProps) {
  const [info, setInfo] = useState<ProjectInfo | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [gitBranch, setGitBranch] = useState<string>('')

  useEffect(() => {
    if (projectPath) {
      window.electronAPI.getProjectInfo(projectPath).then((projectInfo) => {
        setInfo(projectInfo)
        setGitBranch(projectInfo.gitBranch)
      })
    }
  }, [projectPath])

  // Listen for git branch changes
  useEffect(() => {
    if (!sessionId) return
    const unsubscribe = window.electronAPI.onSessionGitBranch((sid, branch) => {
      if (sid === sessionId) {
        setGitBranch(branch)
      }
    })
    return unsubscribe
  }, [sessionId])

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
        {gitBranch && (
          <span className="badge branch-badge">
            <GitBranch size={12} />
            {gitBranch}
          </span>
        )}
        {uniquePorts.length > 0 && (
          <span className="badge port-badge">
            <Globe size={12} />
            {uniquePorts.join(', ')}
          </span>
        )}
        <div className="session-header-spacer" />
        <button
          className="settings-btn"
          onClick={() => setShowSettings(true)}
          title="設定"
        >
          <Settings size={16} />
        </button>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}
