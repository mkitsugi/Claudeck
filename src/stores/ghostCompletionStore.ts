import { create } from 'zustand'

export type CompletionType = 'path' | 'history' | 'git' | 'command' | null

interface GhostCompletionState {
  isActive: boolean
  ghostText: string
  completionType: CompletionType
  cursorX: number
  cursorY: number

  setGhost: (text: string, type: CompletionType, x: number, y: number) => void
  clear: () => void
}

export const useGhostCompletionStore = create<GhostCompletionState>((set) => ({
  isActive: false,
  ghostText: '',
  completionType: null,
  cursorX: 0,
  cursorY: 0,

  setGhost: (text: string, type: CompletionType, x: number, y: number) =>
    set({
      isActive: text.length > 0,
      ghostText: text,
      completionType: type,
      cursorX: x,
      cursorY: y,
    }),

  clear: () =>
    set({
      isActive: false,
      ghostText: '',
      completionType: null,
    }),
}))
