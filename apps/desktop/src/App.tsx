import { useEffect, useCallback } from 'react'
import { Layout } from './components/Layout'
import { useScriptsStore } from './stores/scriptsStore'
import { useCommandStore } from './stores/commandStore'
import { useSessionStore } from './stores/sessionStore'
import { useProjectStore } from './stores/projectStore'
import { useSidebarStore } from './stores/sidebarStore'
import { useThemeStore } from './stores/themeStore'
import { useSettingsStore } from './stores/settingsStore'
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
  const { sessions, setActiveSession } = useSessionStore()
  const { selectedProjectId } = useProjectStore()
  const { initializeTheme } = useThemeStore()
  const { shortcuts, initialize: initializeSettings } = useSettingsStore()

  // テーマと設定の初期化
  useEffect(() => {
    initializeTheme()
    initializeSettings()
  }, [initializeTheme, initializeSettings])

  const selectPane = useCallback((index: number) => {
    const projectSessions = sessions.filter(s => s.projectId === selectedProjectId)
    if (index < projectSessions.length) {
      setActiveSession(projectSessions[index].id)
    }
  }, [sessions, selectedProjectId, setActiveSession])

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
      // Cmd+1,2,3,4 to switch panes directly
      if (e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const paneIndex = ['1', '2', '3', '4'].indexOf(e.key)
        if (paneIndex !== -1) {
          e.preventDefault()
          selectPane(paneIndex)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, toggleCommandPalette, toggleCommandHistory, toggleSidebar, selectPane])

  return <Layout />
}
