import { create } from 'zustand'

export interface CommandEntry {
  command: string
  count: number
  lastUsed: number
  projectPath: string
  isFavorite: boolean
}

type SortMode = 'frequency' | 'recent'

interface CommandState {
  entries: CommandEntry[]
  favorites: CommandEntry[]
  isLoading: boolean
  isOpen: boolean
  sortMode: SortMode
  loadCommands: () => Promise<void>
  addCommand: (command: string, projectPath: string) => Promise<void>
  toggleFavorite: (command: string, projectPath: string) => Promise<void>
  setOpen: (open: boolean) => void
  toggle: () => void
  setSortMode: (mode: SortMode) => void
  getByProject: (projectPath: string) => CommandEntry[]
  getByFrequency: (projectPath: string) => CommandEntry[]
  getByRecent: (projectPath: string) => CommandEntry[]
}

export const useCommandStore = create<CommandState>((set, get) => ({
  entries: [],
  favorites: [],
  isLoading: false,
  isOpen: false,
  sortMode: 'frequency',

  loadCommands: async () => {
    set({ isLoading: true })
    try {
      const data = await window.electronAPI.loadCommands()
      set({
        entries: data.entries,
        favorites: data.entries.filter((e: CommandEntry) => e.isFavorite),
        isLoading: false,
      })
    } catch (error) {
      console.error('Failed to load commands:', error)
      set({ isLoading: false })
    }
  },

  addCommand: async (command: string, projectPath: string) => {
    try {
      const data = await window.electronAPI.addCommand(command, projectPath)
      set({
        entries: data.entries,
        favorites: data.entries.filter((e: CommandEntry) => e.isFavorite),
      })
    } catch (error) {
      console.error('Failed to add command:', error)
    }
  },

  toggleFavorite: async (command: string, projectPath: string) => {
    try {
      const data = await window.electronAPI.toggleFavorite(command, projectPath)
      set({
        entries: data.entries,
        favorites: data.entries.filter((e: CommandEntry) => e.isFavorite),
      })
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  },

  setOpen: (open: boolean) => set({ isOpen: open }),

  toggle: () => set((state) => ({ isOpen: !state.isOpen })),

  setSortMode: (mode: SortMode) => set({ sortMode: mode }),

  getByProject: (projectPath: string) => {
    return get().entries.filter((e) => e.projectPath === projectPath)
  },

  getByFrequency: (projectPath: string) => {
    return get()
      .getByProject(projectPath)
      .sort((a, b) => b.count - a.count)
  },

  getByRecent: (projectPath: string) => {
    return get()
      .getByProject(projectPath)
      .sort((a, b) => b.lastUsed - a.lastUsed)
  },
}))
