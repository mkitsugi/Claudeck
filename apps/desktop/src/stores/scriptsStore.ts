import { create } from 'zustand'

export type PackageManager = 'npm' | 'bun' | 'pnpm' | 'yarn'

interface ScriptsState {
  scripts: Record<string, string>
  packageManager: PackageManager
  isLoading: boolean
  currentProjectPath: string | null
  isOpen: boolean
  loadScripts: (projectPath: string) => Promise<void>
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useScriptsStore = create<ScriptsState>((set, get) => ({
  scripts: {},
  packageManager: 'npm',
  isLoading: false,
  currentProjectPath: null,
  isOpen: false,

  loadScripts: async (projectPath: string) => {
    // Return cached if same project
    if (get().currentProjectPath === projectPath && Object.keys(get().scripts).length > 0) {
      return
    }

    set({ isLoading: true })
    try {
      const result = await window.electronAPI.readScripts(projectPath)
      set({
        scripts: result.scripts,
        packageManager: result.packageManager,
        currentProjectPath: projectPath,
        isLoading: false,
      })
    } catch (error) {
      console.error('Failed to load scripts:', error)
      set({ isLoading: false })
    }
  },

  setOpen: (open: boolean) => set({ isOpen: open }),

  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))
