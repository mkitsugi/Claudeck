import { create } from 'zustand'
import type { ClaudeState, ClaudeStateInfo } from '../types'

interface ClaudeStateStore {
  // Session states map
  sessionStates: Map<string, ClaudeStateInfo>

  // Set state for a session
  setSessionState: (sessionId: string, state: ClaudeState, isClaudeActive: boolean) => void

  // Get state for a session
  getSessionState: (sessionId: string) => ClaudeStateInfo

  // Remove session state
  removeSession: (sessionId: string) => void
}

export const useClaudeStateStore = create<ClaudeStateStore>((set, get) => ({
  sessionStates: new Map(),

  setSessionState: (sessionId, state, isClaudeActive) =>
    set((prev) => {
      const newStates = new Map(prev.sessionStates)
      newStates.set(sessionId, { state, isClaudeActive })
      return { sessionStates: newStates }
    }),

  getSessionState: (sessionId) => {
    return get().sessionStates.get(sessionId) ?? { state: 'idle', isClaudeActive: false }
  },

  removeSession: (sessionId) =>
    set((prev) => {
      const newStates = new Map(prev.sessionStates)
      newStates.delete(sessionId)
      return { sessionStates: newStates }
    }),
}))
