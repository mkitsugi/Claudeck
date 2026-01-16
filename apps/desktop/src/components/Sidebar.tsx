import { useEffect, useState, useMemo } from 'react'
import { RefreshCw, Search, ChevronRight, ChevronDown, Star, List, PanelLeftClose } from 'lucide-react'
import { useProjectStore } from '../stores/projectStore'
import { ProjectItem } from './ProjectItem'
import { isDropdownMode } from '../utils/isDropdownMode'
import type { Project } from '../types'

type TabType = 'all' | 'favorites'

interface ProjectGroup {
  parent: Project
  children: Project[]
}

interface SidebarProps {
  onCollapse?: () => void
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
        setExpandedGroups(prev => new Set([...prev, selected.parentProject!]))
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

  // Group projects by parent-child relationship
  const groupedProjects = useMemo(() => {
    let filtered = projects.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Filter by favorites if on favorites tab
    // worktreeの場合は親がお気に入りなら表示する
    if (activeTab === 'favorites') {
      filtered = filtered.filter(p =>
        favorites.includes(p.id) ||
        (p.parentProject && favorites.includes(p.parentProject))
      )
    }

    const parentProjects = filtered.filter(p => !p.parentProject)
    const childMap = new Map<string, Project[]>()

    filtered.forEach(p => {
      if (p.parentProject) {
        const children = childMap.get(p.parentProject) || []
        children.push(p)
        childMap.set(p.parentProject, children)
      }
    })

    const groups: ProjectGroup[] = parentProjects.map(parent => ({
      parent,
      children: childMap.get(parent.id) || []
    }))

    // Sort by name
    groups.sort((a, b) => a.parent.name.localeCompare(b.parent.name))

    return groups
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
        ) : groupedProjects.length === 0 ? (
          <div className="empty">No projects found</div>
        ) : (
          groupedProjects.map((group) => (
            <div key={group.parent.id} className="project-group">
              <div className={`project-group-header ${selectedProjectId === group.parent.id ? 'selected' : ''}`}>
                {group.children.length > 0 && (
                  <button
                    className="expand-btn"
                    onClick={() => toggleGroup(group.parent.id)}
                  >
                    {expandedGroups.has(group.parent.id) ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>
                )}
                <ProjectItem
                  project={group.parent}
                  isSelected={selectedProjectId === group.parent.id}
                  onClick={() => selectProject(group.parent.id)}
                  hasChildren={group.children.length > 0}
                />
              </div>
              {group.children.length > 0 && expandedGroups.has(group.parent.id) && (
                <div className="project-children">
                  {group.children.map(child => (
                    <ProjectItem
                      key={child.id}
                      project={child}
                      isSelected={selectedProjectId === child.id}
                      onClick={() => selectProject(child.id)}
                      isChild
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
