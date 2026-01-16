import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project } from '../types'

interface ProjectState {
  projects: Project[]
  selectedProjectId: string | null
  isLoading: boolean
  favorites: string[]
  setProjects: (projects: Project[]) => void
  selectProject: (projectId: string | null) => void
  setLoading: (loading: boolean) => void
  toggleFavorite: (projectId: string) => void
  isFavorite: (projectId: string) => boolean
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      selectedProjectId: null,
      isLoading: false,
      favorites: [],
      setProjects: (projects) => set({ projects }),
      selectProject: (projectId) => set({ selectedProjectId: projectId }),
      setLoading: (loading) => set({ isLoading: loading }),
      toggleFavorite: (projectId) =>
        set((state) => ({
          favorites: state.favorites.includes(projectId)
            ? state.favorites.filter((id) => id !== projectId)
            : [...state.favorites, projectId],
        })),
      isFavorite: (projectId) => get().favorites.includes(projectId),
    }),
    {
      name: 'claudeck-project-store',
      partialize: (state) => ({ favorites: state.favorites }),
    }
  )
)
