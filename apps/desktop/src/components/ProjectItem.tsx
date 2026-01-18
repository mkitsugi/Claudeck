import { Folder, GitBranch, FolderTree, Star, Circle, Loader, MessageCircle } from 'lucide-react'
import type { Project, ClaudeState } from '../types'
import { useProjectStore } from '../stores/projectStore'
import { useSessionStore } from '../stores/sessionStore'
import { useClaudeStateStore } from '../stores/claudeStateStore'

interface ProjectItemProps {
  project: Project
  isSelected: boolean
  onClick: () => void
  hasChildren?: boolean
  depth?: number  // ネストの深さ
}

// 優先度: waiting-input > processing > idle
const STATE_PRIORITY: Record<ClaudeState, number> = {
  'waiting-input': 3,
  'processing': 2,
  'idle': 1,
}

const STATE_ICON_MAP: Record<ClaudeState, typeof Circle> = {
  'idle': Circle,
  'processing': Loader,
  'waiting-input': MessageCircle,
}

export function ProjectItem({ project, isSelected, onClick, hasChildren, depth = 0 }: ProjectItemProps) {
  const { projects, favorites, toggleFavorite } = useProjectStore()
  const sessions = useSessionStore((state) => state.sessions)
  const sessionStates = useClaudeStateStore((state) => state.sessionStates)
  const isFavorite = favorites.includes(project.id)
  const isChild = depth > 0

  // このプロジェクトに関連するセッションの状態を取得
  const projectSessions = sessions.filter((s) => s.projectId === project.id)

  // 優先度が最も高い状態を取得（Claudeがアクティブなセッションのみ）
  const highestPriorityState = projectSessions.reduce<{ state: ClaudeState; isClaudeActive: boolean } | null>(
    (highest, session) => {
      const stateInfo = sessionStates.get(session.id)
      if (!stateInfo || !stateInfo.isClaudeActive) return highest
      if (!highest) return stateInfo
      if (STATE_PRIORITY[stateInfo.state] > STATE_PRIORITY[highest.state]) {
        return stateInfo
      }
      return highest
    },
    null
  )

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFavorite(project.id)
  }

  // worktreeの場合、親の名前と重複する部分を省略
  const displayName = (() => {
    if (!project.parentProject) return project.name
    const parent = projects.find(p => p.id === project.parentProject)
    if (!parent) return project.name
    // 親の名前で始まっていたら、その部分を削除
    if (project.name.startsWith(parent.name)) {
      const suffix = project.name.slice(parent.name.length)
      // 先頭の区切り文字（-や_）も削除
      return suffix.replace(/^[-_]/, '') || project.name
    }
    return project.name
  })()

  // 深さに応じたインデントを計算
  const basePadding = hasChildren ? 0 : 22
  const depthPadding = depth * 16  // 各階層ごとに16pxのインデント

  return (
    <div
      className={`project-item ${isSelected ? 'selected' : ''} ${isChild ? 'child' : ''}`}
      onClick={onClick}
      style={{ paddingLeft: basePadding + depthPadding }}
    >
      <Folder size={16} className="project-icon" />
      <div className="project-info">
        <span className="project-name">{displayName}</span>
        {project.parentType === 'worktree' && project.branch && (
          <span className="project-branch">
            <GitBranch size={10} />
            {project.branch}
          </span>
        )}
        {project.parentType === 'path' && (
          <span className="project-subdir">
            <FolderTree size={10} />
          </span>
        )}
      </div>
      {highestPriorityState && (
        <SidebarStateIcon state={highestPriorityState.state} />
      )}
      <button
        className={`favorite-btn ${isFavorite ? 'active' : ''}`}
        onClick={handleFavoriteClick}
        title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
      >
        <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

// サイドバー用のコンパクトなステータスアイコン
function SidebarStateIcon({ state }: { state: ClaudeState }) {
  const Icon = STATE_ICON_MAP[state]
  const stateClass = state === 'idle' ? 'state-idle' : state === 'processing' ? 'state-processing' : 'state-waiting'
  const title = state === 'idle' ? 'Idle' : state === 'processing' ? 'Processing' : 'Waiting for input'

  return (
    <span className={`sidebar-state-icon ${stateClass}`} title={title}>
      <Icon size={12} />
    </span>
  )
}
