import { useCallback, useEffect, useRef, useState } from 'react'
import { Sidebar } from './Sidebar'
import { SessionHeader } from './SessionHeader'
import { XtermWrapper } from './XtermWrapper'
import { CommandPalette } from './CommandPalette'
import { CommandHistory } from './CommandHistory'
import { ShortcutOverlay } from './ShortcutOverlay'
import { UpdateBanner } from './UpdateBanner'
import { ClaudeStateIndicator } from './ClaudeStateIndicator'
import { HooksSetupModal } from './HooksSetupModal'
import claudeColorSvg from '/claude-color.svg'
import { useProjectStore } from '../stores/projectStore'
import { useSessionStore } from '../stores/sessionStore'
import { useSidebarStore } from '../stores/sidebarStore'
import { useClaudeStateStore } from '../stores/claudeStateStore'
import type { Session } from '../types'

interface HooksStatus {
  isConfigured: boolean
  hasScript: boolean
  hasSettings: boolean
  missingHooks: string[]
}

const DEFAULT_SESSION_COUNT = 4

export function Layout() {
  const { projects, selectedProjectId } = useProjectStore()
  const { sessions, activeSessionId, addSession, removeSession, setActiveSession, toggleMinimized, minimizedSessionIds } = useSessionStore()
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useSidebarStore()
  const { sessionStates, setSessionState } = useClaudeStateStore()
  const [sessionCwds, setSessionCwds] = useState<Map<string, string>>(new Map())
  const [sessionPorts, setSessionPorts] = useState<Map<string, Set<number>>>(new Map())
  const creatingSessionsRef = useRef<Set<string>>(new Set())
  const [showHooksModal, setShowHooksModal] = useState(false)
  const hooksCheckDoneRef = useRef(false)

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

  // Listen for Claude state changes
  useEffect(() => {
    const unsubscribe = window.electronAPI.onSessionClaudeState((sessionId, state, isClaudeActive) => {
      setSessionState(sessionId, state, isClaudeActive)
    })
    return unsubscribe
  }, [setSessionState])

  // Check hooks status on mount (show modal if not configured)
  useEffect(() => {
    if (hooksCheckDoneRef.current) return
    hooksCheckDoneRef.current = true

    const checkHooks = async () => {
      try {
        const status = await window.electronAPI.checkHooksStatus() as HooksStatus
        if (!status.isConfigured) {
          // Delay showing modal to avoid interrupting initial load
          setTimeout(() => setShowHooksModal(true), 2000)
        }
      } catch (e) {
        console.error('Failed to check hooks status:', e)
      }
    }
    checkHooks()
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
              sessionId={activeSessionId ?? undefined}
            />
            <div className="terminal-grid">
              {(() => {
                // 左列（インデックス0, 2）と右列（インデックス1, 3）に分ける
                const leftColumn = projectSessions.filter((_, i) => i % 2 === 0)
                const rightColumn = projectSessions.filter((_, i) => i % 2 === 1)

                // フォーカスされているペインがどの列にあるか
                const focusedIndex = projectSessions.findIndex(s => s.id === activeSessionId)
                const focusedInLeft = focusedIndex !== -1 && focusedIndex % 2 === 0
                const focusedInRight = focusedIndex !== -1 && focusedIndex % 2 === 1

                const renderPane = (session: Session, originalIndex: number) => {
                  const stateInfo = sessionStates.get(session.id) ?? { state: 'idle', isClaudeActive: false }
                  const isFocused = activeSessionId === session.id
                  const needsAttention = !isFocused && stateInfo.isClaudeActive && stateInfo.state === 'waiting-input'
                  const isMinimized = minimizedSessionIds.has(session.id)

                  return (
                    <div
                      key={session.id}
                      className={`terminal-pane ${isFocused ? 'focused' : ''} ${needsAttention ? 'needs-attention' : ''} ${stateInfo.isClaudeActive ? `claude-${stateInfo.state}` : ''} ${isMinimized ? 'minimized' : ''}`}
                      onClick={() => {
                        if (isMinimized) {
                          toggleMinimized(session.id)
                        }
                        setActiveSession(session.id)
                      }}
                    >
                      <div className="pane-header">
                        <span className="pane-number">{originalIndex + 1}</span>
                        <button
                          className="claude-pane-button"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.electronAPI.writeSession(session.id, 'claude\n')
                          }}
                          title="claude コマンドを実行"
                        >
                          <img src={claudeColorSvg} alt="Claude" width={16} height={16} />
                        </button>
                        {stateInfo.isClaudeActive && (
                          <ClaudeStateIndicator state={stateInfo.state} />
                        )}
                        <div className="pane-header-spacer" />
                        <button
                          className="pane-minimize"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMinimized(session.id)
                          }}
                          title={isMinimized ? '展開' : '最小化'}
                        >
                          {isMinimized ? '□' : '−'}
                        </button>
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
                      <div className="terminal-content">
                        <XtermWrapper
                          sessionId={session.id}
                          isActive={isFocused && !isMinimized}
                          projectPath={selectedProject.path}
                          onActivate={() => setActiveSession(session.id)}
                        />
                      </div>
                    </div>
                  )
                }

                return (
                  <>
                    <div className={`terminal-column ${focusedInLeft ? 'has-focus' : ''} ${focusedInRight ? 'other-focus' : ''}`}>
                      {leftColumn.map((session) => {
                        const originalIndex = projectSessions.findIndex(s => s.id === session.id)
                        return renderPane(session, originalIndex)
                      })}
                      {projectSessions.length < 1 && (
                        <div className="terminal-pane add-pane" onClick={createSession}>
                          <div className="add-pane-content">
                            <span className="add-pane-icon">+</span>
                            <span className="add-pane-text">Add Terminal</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={`terminal-column ${focusedInRight ? 'has-focus' : ''} ${focusedInLeft ? 'other-focus' : ''}`}>
                      {rightColumn.map((session) => {
                        const originalIndex = projectSessions.findIndex(s => s.id === session.id)
                        return renderPane(session, originalIndex)
                      })}
                      {projectSessions.length >= 1 && projectSessions.length < DEFAULT_SESSION_COUNT && (
                        <div className="terminal-pane add-pane" onClick={createSession}>
                          <div className="add-pane-content">
                            <span className="add-pane-icon">+</span>
                            <span className="add-pane-text">Add Terminal</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
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
      <HooksSetupModal isOpen={showHooksModal} onClose={() => setShowHooksModal(false)} />
    </div>
  )
}
