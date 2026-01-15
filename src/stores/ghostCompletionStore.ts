import { create } from 'zustand'

export type CompletionType = 'path' | 'history' | 'git' | 'command' | null

interface GhostCompletionState {
  isActive: boolean
  ghostText: string
  completionType: CompletionType
  cursorX: number
  cursorY: number
  justAccepted: boolean // Flag to prevent pane switching right after accepting

  setGhost: (text: string, type: CompletionType, x: number, y: number) => void
  accept: () => void // Accept completion and set justAccepted flag
  clear: () => void
}

export const useGhostCompletionStore = create<GhostCompletionState>((set) => ({
  isActive: false,
  ghostText: '',
  completionType: null,
  cursorX: 0,
  cursorY: 0,
  justAccepted: false,

  setGhost: (text: string, type: CompletionType, x: number, y: number) =>
    set({
      isActive: text.length > 0,
      ghostText: text,
      completionType: type,
      cursorX: x,
      cursorY: y,
    }),

  accept: () => {
    set({
      isActive: false,
      ghostText: '',
      completionType: null,
      justAccepted: true,
    })
    // Reset justAccepted after a short delay
    setTimeout(() => {
      set({ justAccepted: false })
    }, 100)
  },

  clear: () =>
    set({
      isActive: false,
      ghostText: '',
      completionType: null,
    }),
}))
