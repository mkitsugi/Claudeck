import { useEffect, useState, useMemo } from 'react'
import { RefreshCw, Search, ChevronRight, ChevronDown, Star, List, PanelLeftClose } from 'lucide-react'
import { useProjectStore } from '../stores/projectStore'
import { ProjectItem } from './ProjectItem'
import { isDropdownMode } from '../utils/isDropdownMode'
import type { Project } from '../types'

type TabType = 'all' | 'favorites'

interface ProjectTreeNode {
  project: Project
  children: ProjectTreeNode[]
}

interface SidebarProps {
  onCollapse?: () => void
}

// ツリー構築関数
function buildTree(projects: Project[]): ProjectTreeNode[] {
  const childMap = new Map<string | undefined, Project[]>()

  projects.forEach(p => {
    const parentId = p.parentProject
    const siblings = childMap.get(parentId) || []
    siblings.push(p)
    childMap.set(parentId, siblings)
  })

  function buildNode(project: Project): ProjectTreeNode {
    const children = (childMap.get(project.id) || [])
      .sort((a, b) => a.name.localeCompare(b.name))
    return {
      project,
      children: children.map(buildNode)
    }
  }

  // ルートノード（親がないプロジェクト）
  const roots = (childMap.get(undefined) || [])
    .sort((a, b) => a.name.localeCompare(b.name))
  return roots.map(buildNode)
}

interface ProjectTreeItemProps {
  node: ProjectTreeNode
  depth: number
  selectedProjectId: string | null
  expandedGroups: Set<string>
  toggleGroup: (id: string) => void
  selectProject: (id: string) => void
}

function ProjectTreeItem({
  node,
  depth,
  selectedProjectId,
  expandedGroups,
  toggleGroup,
  selectProject
}: ProjectTreeItemProps) {
  const hasChildren = node.children.length > 0
  const isExpanded = expandedGroups.has(node.project.id)

  return (
    <div className="project-group">
      <div className={`project-group-header ${selectedProjectId === node.project.id ? 'selected' : ''}`}>
        {hasChildren && (
          <button
            className="expand-btn"
            onClick={() => toggleGroup(node.project.id)}
          >
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        )}
        <ProjectItem
          project={node.project}
          isSelected={selectedProjectId === node.project.id}
          onClick={() => selectProject(node.project.id)}
          hasChildren={hasChildren}
          depth={depth}
        />
      </div>
      {hasChildren && isExpanded && (
        <div className="project-children">
          {node.children.map(child => (
            <ProjectTreeItem
              key={child.project.id}
              node={child}
              depth={depth + 1}
              selectedProjectId={selectedProjectId}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              selectProject={selectProject}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ onCollapse }: SidebarProps) {
  const { projects, selectedProjectId, isLoading, favorites, setProjects, selectProject, setLoading } = useProjectStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<TabType>('favorites')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.scanProjects()
      setProjects(result)
      if (result.length > 0 && !selectedProjectId) {
        selectProject(result[0].id)
      }
      // Auto-expand groups that have the selected project
      const selected = result.find((p: Project) => p.id === selectedProjectId)
      if (selected?.parentProject) {
        // 選択されたプロジェクトの全ての親を展開
        const parentsToExpand = new Set<string>()
        let current = selected
        while (current.parentProject) {
          parentsToExpand.add(current.parentProject)
          current = result.find((p: Project) => p.id === current.parentProject) as Project
          if (!current) break
        }
        setExpandedGroups(prev => new Set([...prev, ...parentsToExpand]))
      }
    } catch (error) {
      console.error('Failed to scan projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.refreshProjects()
      setProjects(result)
    } catch (error) {
      console.error('Failed to refresh projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleGroup = (projectId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  // フィルタリングしてツリーを構築
  const projectTree = useMemo(() => {
    let filtered = projects.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // お気に入りタブの場合
    if (activeTab === 'favorites') {
      // お気に入りプロジェクトとその子孫を含める
      const favoriteIds = new Set(favorites)

      // 親がお気に入りかどうかをチェック（祖先も含む）
      const isAncestorFavorite = (project: Project): boolean => {
        if (!project.parentProject) return false
        if (favoriteIds.has(project.parentProject)) return true
        const parent = projects.find(p => p.id === project.parentProject)
        return parent ? isAncestorFavorite(parent) : false
      }

      filtered = filtered.filter(p =>
        favoriteIds.has(p.id) || isAncestorFavorite(p)
      )
    }

    return buildTree(filtered)
  }, [projects, searchQuery, activeTab, favorites])

  const isDropdown = isDropdownMode()

  return (
    <div className="sidebar">
      {!isDropdown && (
        <div className="sidebar-header">
          <h2>Claudeck</h2>
          <div className="sidebar-header-actions">
            <button
              className="refresh-btn"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
            </button>
            {onCollapse && (
              <button
                className="collapse-btn"
                onClick={onCollapse}
                title="サイドバーを閉じる"
              >
                <PanelLeftClose size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="search-box">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <List size={14} />
          <span>すべて</span>
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          <Star size={14} />
          <span>お気に入り</span>
        </button>
      </div>

      <div className="project-list">
        {isLoading && projects.length === 0 ? (
          <div className="loading">Scanning projects...</div>
        ) : projectTree.length === 0 ? (
          <div className="empty">No projects found</div>
        ) : (
          projectTree.map((node) => (
            <ProjectTreeItem
              key={node.project.id}
              node={node}
              depth={0}
              selectedProjectId={selectedProjectId}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              selectProject={selectProject}
            />
          ))
        )}
      </div>
    </div>
  )
}
