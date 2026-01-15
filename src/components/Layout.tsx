import { useCallback, useEffect, useRef, useState } from 'react'
import { Sidebar } from './Sidebar'
import { SessionHeader } from './SessionHeader'
import { XtermWrapper } from './XtermWrapper'
import { CommandPalette } from './CommandPalette'
import { CommandHistory } from './CommandHistory'
import { ShortcutOverlay } from './ShortcutOverlay'
import { UpdateBanner } from './UpdateBanner'
import { useProjectStore } from '../stores/projectStore'
import { useSessionStore } from '../stores/sessionStore'
import { useSidebarStore } from '../stores/sidebarStore'
import type { Session } from '../types'

const DEFAULT_SESSION_COUNT = 4

export function Layout() {
  const { projects, selectedProjectId } = useProjectStore()
  const { sessions, activeSessionId, addSession, removeSession, setActiveSession } = useSessionStore()
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useSidebarStore()
  const [sessionCwds, setSessionCwds] = useState<Map<string, string>>(new Map())
  const [sessionPorts, setSessionPorts] = useState<Map<string, Set<number>>>(new Map())
  const creatingSessionsRef = useRef<Set<string>>(new Set())

  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const projectSessions = sessions.filter((s) => s.projectId === selectedProjectId)

  // Listen for cwd changes
  useEffect(() => {
    const unsubscribe = window.electronAPI.onSessionCwd((sessionId: string, cwd: string) => {
      setSessionCwds(prev => {
        const next = new Map(prev)
        next.set(sessionId, cwd)
        return next
      })
    })
    return unsubscribe
  }, [])

  // Listen for port changes
  useEffect(() => {
    const unsubscribe = window.electronAPI.onSessionPort((sessionId: string, port: number) => {
      setSessionPorts(prev => {
        const next = new Map(prev)
        const ports = next.get(sessionId) || new Set()
        ports.add(port)
        next.set(sessionId, ports)
        return next
      })
    })
    return unsubscribe
  }, [])

  // Clear ports when session exits
  useEffect(() => {
    const unsubscribe = window.electronAPI.onSessionExit((sessionId: string) => {
      setSessionPorts(prev => {
        const next = new Map(prev)
        next.delete(sessionId)
        return next
      })
    })
    return unsubscribe
  }, [])

  // Clear ports on Ctrl+C
  useEffect(() => {
    const unsubscribe = window.electronAPI.onSessionPortClear((sessionId: string) => {
      setSessionPorts(prev => {
        const next = new Map(prev)
        next.delete(sessionId)
        return next
      })
    })
    return unsubscribe
  }, [])

  const createSession = useCallback(async () => {
    if (!selectedProject) return null

    try {
      const sessionId = await window.electronAPI.createSession(
        selectedProject.id,
        selectedProject.path
      )

      const newSession: Session = {
        id: sessionId,
        projectId: selectedProject.id,
        name: `Session ${projectSessions.length + 1}`,
        cwd: selectedProject.path,
        createdAt: Date.now(),
        isActive: true,
      }

      addSession(newSession)
      return sessionId
    } catch (error) {
      console.error('Failed to create session:', error)
      return null
    }
  }, [selectedProject, projectSessions.length, addSession])

  const closeSession = useCallback(async (sessionId: string) => {
    try {
      await window.electronAPI.destroySession(sessionId)
      removeSession(sessionId)
    } catch (error) {
      console.error('Failed to close session:', error)
    }
  }, [removeSession])

  // Auto-create 4 sessions when project is selected
  useEffect(() => {
    if (selectedProjectId && projectSessions.length === 0 && selectedProject) {
      // Guard against double execution (React StrictMode)
      if (creatingSessionsRef.current.has(selectedProjectId)) return
      creatingSessionsRef.current.add(selectedProjectId)

      const createInitialSessions = async () => {
        let firstSessionId: string | null = null
        for (let i = 0; i < DEFAULT_SESSION_COUNT; i++) {
          const id = await createSession()
          if (i === 0) firstSessionId = id
        }
        // Set focus to first session (top-left)
        if (firstSessionId) {
          setActiveSession(firstSessionId)
        }
      }
      createInitialSessions()
    }
  }, [selectedProjectId, selectedProject])

  // Set active session to first one when switching projects
  useEffect(() => {
    if (projectSessions.length > 0 && !projectSessions.find(s => s.id === activeSessionId)) {
      setActiveSession(projectSessions[0].id)
    }
  }, [projectSessions, activeSessionId, setActiveSession])

  const currentCwd = activeSessionId
    ? (sessionCwds.get(activeSessionId) || selectedProject?.path || '')
    : (selectedProject?.path || '')

  // Collect all ports from project sessions
  const activePorts = projectSessions.flatMap(s => {
    const ports = sessionPorts.get(s.id)
    return ports ? Array.from(ports) : []
  })

  return (
    <div className="layout">
      <UpdateBanner />
      <div className={`sidebar-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Sidebar onCollapse={() => setSidebarCollapsed(true)} />
      </div>
      <div className="main-content">
        {selectedProject ? (
          <>
            <SessionHeader
              projectPath={currentCwd}
              ports={activePorts}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed(false)}
            />
            <div className="terminal-grid">
              {projectSessions.map((session, index) => (
                <div
                  key={session.id}
                  className={`terminal-pane ${activeSessionId === session.id ? 'focused' : ''}`}
                  onClick={() => setActiveSession(session.id)}
                >
                  <div className="pane-header">
                    <span className="pane-number">{index + 1}</span>
                    <button
                      className="pane-close"
                      onClick={(e) => {
                        e.stopPropagation()
                        closeSession(session.id)
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <XtermWrapper
                    sessionId={session.id}
                    isActive={activeSessionId === session.id}
                    projectPath={selectedProject.path}
                  />
                </div>
              ))}
              {projectSessions.length < DEFAULT_SESSION_COUNT && (
                <div
                  className="terminal-pane add-pane"
                  onClick={createSession}
                >
                  <div className="add-pane-content">
                    <span className="add-pane-icon">+</span>
                    <span className="add-pane-text">Add Terminal</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="no-project">
            <p>Select a project from the sidebar to start</p>
          </div>
        )}
      </div>
      <CommandPalette projectPath={selectedProject?.path ?? null} />
      <CommandHistory projectPath={selectedProject?.path ?? null} />
      <ShortcutOverlay />
    </div>
  )
}
