import { useEffect, useCallback } from 'react'
import { Layout } from './components/Layout'
import { useScriptsStore } from './stores/scriptsStore'
import { useCommandStore } from './stores/commandStore'
import { useSessionStore } from './stores/sessionStore'
import { useProjectStore } from './stores/projectStore'
import { useSidebarStore } from './stores/sidebarStore'
import { useThemeStore } from './stores/themeStore'
import { useSettingsStore } from './stores/settingsStore'
import { useGhostCompletionStore } from './stores/ghostCompletionStore'
import './index.css'

// Helper to check if a keyboard event matches a shortcut string
function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split('+')
  const needsMeta = parts.includes('Meta') || parts.includes('CommandOrControl')
  const needsCtrl = parts.includes('Control')
  const needsAlt = parts.includes('Alt')
  const needsShift = parts.includes('Shift')
  const key = parts[parts.length - 1].toLowerCase()

  return (
    e.metaKey === needsMeta &&
    e.ctrlKey === needsCtrl &&
    e.altKey === needsAlt &&
    e.shiftKey === needsShift &&
    e.key.toLowerCase() === key
  )
}

export function App() {
  const { toggle: toggleCommandPalette } = useScriptsStore()
  const { toggle: toggleCommandHistory } = useCommandStore()
  const { toggle: toggleSidebar } = useSidebarStore()
  const { sessions, activeSessionId, setActiveSession } = useSessionStore()
  const { selectedProjectId } = useProjectStore()
  const { initializeTheme } = useThemeStore()
  const { shortcuts, initialize: initializeSettings } = useSettingsStore()

  // テーマと設定の初期化
  useEffect(() => {
    initializeTheme()
    initializeSettings()
  }, [initializeTheme, initializeSettings])

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
      // Command palette shortcut
      if (matchesShortcut(e, shortcuts.commandPalette)) {
        e.preventDefault()
        toggleCommandPalette()
        return
      }
      // Command history shortcut
      if (matchesShortcut(e, shortcuts.commandHistory)) {
        e.preventDefault()
        toggleCommandHistory()
        return
      }
      // Toggle sidebar shortcut
      if (matchesShortcut(e, shortcuts.toggleSidebar)) {
        e.preventDefault()
        toggleSidebar()
        return
      }
      // Tab to cycle through panes (Shift+Tab is reserved for Claude Code)
      // Skip if ghost completion is active or was just accepted
      if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const ghostStore = useGhostCompletionStore.getState()
        if (ghostStore.isActive || ghostStore.justAccepted) {
          // Ghost is active or just accepted - prevent default Tab behavior (focus change)
          e.preventDefault()
          return
        }
        e.preventDefault()
        cyclePane('next')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, toggleCommandPalette, toggleCommandHistory, toggleSidebar, cyclePane])

  return <Layout />
}
