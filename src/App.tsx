import { useEffect, useCallback } from 'react'
import { Layout } from './components/Layout'
import { useScriptsStore } from './stores/scriptsStore'
import { useCommandStore } from './stores/commandStore'
import { useSessionStore } from './stores/sessionStore'
import { useProjectStore } from './stores/projectStore'
import { useSidebarStore } from './stores/sidebarStore'
import { useThemeStore } from './stores/themeStore'
import './index.css'

export function App() {
  const { toggle: toggleCommandPalette } = useScriptsStore()
  const { toggle: toggleCommandHistory } = useCommandStore()
  const { toggle: toggleSidebar } = useSidebarStore()
  const { sessions, activeSessionId, setActiveSession } = useSessionStore()
  const { selectedProjectId } = useProjectStore()
  const { initializeTheme } = useThemeStore()

  // テーマの初期化
  useEffect(() => {
    initializeTheme()
  }, [initializeTheme])

  const cyclePane = useCallback((direction: 'next' | 'prev') => {
    const projectSessions = sessions.filter(s => s.projectId === selectedProjectId)
    if (projectSessions.length === 0) return

    const currentIndex = projectSessions.findIndex(s => s.id === activeSessionId)
    let nextIndex: number

    if (direction === 'next') {
      nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % projectSessions.length
    } else {
      nextIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + projectSessions.length) % projectSessions.length
    }

    setActiveSession(projectSessions[nextIndex].id)
  }, [sessions, selectedProjectId, activeSessionId, setActiveSession])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd + K to open command palette
      if (e.metaKey && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
      }
      // Cmd + H to open command history
      if (e.metaKey && e.key === 'h') {
        e.preventDefault()
        toggleCommandHistory()
      }
      // Cmd + B to toggle sidebar
      if (e.metaKey && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
      // Tab to cycle through panes (Shift+Tab is reserved for Claude Code)
      if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        cyclePane('next')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleCommandPalette, toggleCommandHistory, toggleSidebar, cyclePane])

  return <Layout />
}
