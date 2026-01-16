import { create } from 'zustand'
import type { Session } from '../types'

interface SessionState {
  sessions: Session[]
  activeSessionId: string | null
  minimizedSessionIds: Set<string>
  addSession: (session: Session) => void
  removeSession: (sessionId: string) => void
  setActiveSession: (sessionId: string | null) => void
  getSessionsByProject: (projectId: string) => Session[]
  toggleMinimized: (sessionId: string) => void
  isMinimized: (sessionId: string) => boolean
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  minimizedSessionIds: new Set(),

  addSession: (session) => set((state) => ({
    sessions: [...state.sessions, session],
    activeSessionId: session.id,
  })),

  removeSession: (sessionId) => set((state) => {
    const newSessions = state.sessions.filter((s) => s.id !== sessionId)
    const wasActive = state.activeSessionId === sessionId
    const newMinimized = new Set(state.minimizedSessionIds)
    newMinimized.delete(sessionId)
    return {
      sessions: newSessions,
      minimizedSessionIds: newMinimized,
      activeSessionId: wasActive
        ? (newSessions.length > 0 ? newSessions[newSessions.length - 1].id : null)
        : state.activeSessionId,
    }
  }),

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  getSessionsByProject: (projectId) => {
    return get().sessions.filter((s) => s.projectId === projectId)
  },

  toggleMinimized: (sessionId) => set((state) => {
    const newMinimized = new Set(state.minimizedSessionIds)
    if (newMinimized.has(sessionId)) {
      newMinimized.delete(sessionId)
    } else {
      newMinimized.add(sessionId)
    }
    return { minimizedSessionIds: newMinimized }
  }),

  isMinimized: (sessionId) => {
    return get().minimizedSessionIds.has(sessionId)
  },
}))
