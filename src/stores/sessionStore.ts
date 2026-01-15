import { create } from 'zustand'
import type { Session } from '../types'

interface SessionState {
  sessions: Session[]
  activeSessionId: string | null
  addSession: (session: Session) => void
  removeSession: (sessionId: string) => void
  setActiveSession: (sessionId: string | null) => void
  getSessionsByProject: (projectId: string) => Session[]
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,

  addSession: (session) => set((state) => ({
    sessions: [...state.sessions, session],
    activeSessionId: session.id,
  })),

  removeSession: (sessionId) => set((state) => {
    const newSessions = state.sessions.filter((s) => s.id !== sessionId)
    const wasActive = state.activeSessionId === sessionId
    return {
      sessions: newSessions,
      activeSessionId: wasActive
        ? (newSessions.length > 0 ? newSessions[newSessions.length - 1].id : null)
        : state.activeSessionId,
    }
  }),

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  getSessionsByProject: (projectId) => {
    return get().sessions.filter((s) => s.projectId === projectId)
  },
}))
