import { Folder, GitBranch, Star } from 'lucide-react'
import type { Project } from '../types'
import { useProjectStore } from '../stores/projectStore'

interface ProjectItemProps {
  project: Project
  isSelected: boolean
  onClick: () => void
  isChild?: boolean
  hasChildren?: boolean
}

export function ProjectItem({ project, isSelected, onClick, isChild, hasChildren }: ProjectItemProps) {
  const { projects, favorites, toggleFavorite } = useProjectStore()
  const isFavorite = favorites.includes(project.id)

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

  return (
    <div
      className={`project-item ${isSelected ? 'selected' : ''} ${isChild ? 'child' : ''}`}
      onClick={onClick}
      style={{ paddingLeft: isChild ? '32px' : hasChildren ? '0' : '22px' }}
    >
      <Folder size={16} className="project-icon" />
      <div className="project-info">
        <span className="project-name">{displayName}</span>
        {project.isWorktree && project.branch && (
          <span className="project-branch">
            <GitBranch size={10} />
            {project.branch}
          </span>
        )}
      </div>
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
