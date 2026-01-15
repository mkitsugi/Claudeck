import { create } from 'zustand'
import type { Theme, ThemeId } from '../themes/types'
import { themes } from '../themes'

interface ThemeState {
  currentThemeId: ThemeId
  currentTheme: Theme
  isLoading: boolean

  // Actions
  setTheme: (themeId: ThemeId) => Promise<void>
  initializeTheme: () => Promise<void>
  applyTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentThemeId: 'dark',
  currentTheme: themes.dark,
  isLoading: true,

  setTheme: async (themeId) => {
    const theme = themes[themeId]
    if (!theme) return

    set({ currentThemeId: themeId, currentTheme: theme })
    get().applyTheme(theme)

    // 設定ファイルに保存
    try {
      await window.electronAPI.saveSettings({ themeId })
    } catch (error) {
      console.error('Failed to save theme settings:', error)
    }
  },

  initializeTheme: async () => {
    try {
      const settings = await window.electronAPI.loadSettings()
      const themeId = (settings?.themeId as ThemeId) || 'dark'
      const theme = themes[themeId] || themes.dark

      set({ currentThemeId: themeId, currentTheme: theme, isLoading: false })
      get().applyTheme(theme)
    } catch (error) {
      console.error('Failed to load theme settings:', error)
      set({ isLoading: false })
      get().applyTheme(themes.dark)
    }
  },

  applyTheme: (theme) => {
    const root = document.documentElement
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })
  },
}))
