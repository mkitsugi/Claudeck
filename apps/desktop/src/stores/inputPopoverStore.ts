import { create } from 'zustand'

export type PopoverTab = 'history' | 'scripts'

interface CursorPosition {
  x: number
  y: number
}

interface InputPopoverState {
  isOpen: boolean
  activeTab: PopoverTab
  selectedIndex: number
  cursorPosition: CursorPosition | null
  setOpen: (open: boolean) => void
  openAtCursor: (position: CursorPosition) => void
  setActiveTab: (tab: PopoverTab) => void
  setSelectedIndex: (index: number) => void
  toggle: () => void
  close: () => void
  nextTab: () => void
  prevTab: () => void
}

export const useInputPopoverStore = create<InputPopoverState>((set) => ({
  isOpen: false,
  activeTab: 'history',
  selectedIndex: 0,
  cursorPosition: null,

  setOpen: (open: boolean) => set({ isOpen: open, selectedIndex: 0 }),

  openAtCursor: (position: CursorPosition) => set({
    isOpen: true,
    selectedIndex: 0,
    cursorPosition: position,
  }),

  setActiveTab: (tab: PopoverTab) => set({ activeTab: tab, selectedIndex: 0 }),

  setSelectedIndex: (index: number) => set({ selectedIndex: index }),

  toggle: () => set((state) => ({
    isOpen: !state.isOpen,
    selectedIndex: 0
  })),

  close: () => set({ isOpen: false, selectedIndex: 0 }),

  nextTab: () => set((state) => ({
    activeTab: state.activeTab === 'history' ? 'scripts' : 'history',
    selectedIndex: 0,
  })),

  prevTab: () => set((state) => ({
    activeTab: state.activeTab === 'history' ? 'scripts' : 'history',
    selectedIndex: 0,
  })),
}))
