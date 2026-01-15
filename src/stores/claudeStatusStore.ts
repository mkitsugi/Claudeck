import { create } from 'zustand'
import type { ClaudeCodeStatus } from '../utils/claudeCodeDetector'

interface ClaudeStatusState {
  // セッションIDごとの状態を管理
  statuses: Record<string, ClaudeCodeStatus>

  // アクティブセッションのIDを追跡
  activeSessionId: string | null

  // 状態を更新
  setStatus: (sessionId: string, status: ClaudeCodeStatus) => void

  // アクティブセッションを設定
  setActiveSession: (sessionId: string | null) => void

  // セッションを削除
  removeSession: (sessionId: string) => void

  // アクティブセッションの状態を取得
  getActiveStatus: () => ClaudeCodeStatus
}

export const useClaudeStatusStore = create<ClaudeStatusState>((set, get) => ({
  statuses: {},
  activeSessionId: null,

  setStatus: (sessionId, status) =>
    set((state) => ({
      statuses: {
        ...state.statuses,
        [sessionId]: status,
      },
    })),

  setActiveSession: (sessionId) =>
    set({ activeSessionId: sessionId }),

  removeSession: (sessionId) =>
    set((state) => {
      const { [sessionId]: _, ...rest } = state.statuses
      return {
        statuses: rest,
        activeSessionId:
          state.activeSessionId === sessionId ? null : state.activeSessionId,
      }
    }),

  getActiveStatus: () => {
    const state = get()
    if (!state.activeSessionId) return 'idle'
    return state.statuses[state.activeSessionId] || 'idle'
  },
}))
