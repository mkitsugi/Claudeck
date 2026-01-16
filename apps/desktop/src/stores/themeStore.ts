import { create } from 'zustand'
import type { Theme, ThemeId, ThemeMode, ThemeColors } from '@claudeck/shared/themes'
import { themes } from '@claudeck/shared/themes'

// システムのダークモード設定を取得するヘルパー
function getSystemMode(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

// モードを解決するヘルパー
function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemMode() : mode
}

interface ThemeState {
  currentThemeId: ThemeId
  currentTheme: Theme
  mode: ThemeMode
  resolvedMode: 'light' | 'dark'
  isLoading: boolean

  // Actions
  setTheme: (themeId: ThemeId) => Promise<void>
  setMode: (mode: ThemeMode) => Promise<void>
  initializeTheme: () => Promise<void>
  applyTheme: (theme: Theme, mode: 'light' | 'dark') => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentThemeId: 'dark',
  currentTheme: themes.dark,
  mode: 'dark',
  resolvedMode: 'dark',
  isLoading: true,

  setTheme: async (themeId) => {
    const theme = themes[themeId]
    if (!theme) return

    const { resolvedMode } = get()

    set({ currentThemeId: themeId, currentTheme: theme })
    get().applyTheme(theme, resolvedMode)

    // 設定ファイルに保存
    try {
      await window.electronAPI.saveSettings({ themeId })
    } catch (error) {
      console.error('Failed to save theme settings:', error)
    }
  },

  setMode: async (mode) => {
    const resolved = resolveMode(mode)
    set({ mode, resolvedMode: resolved })

    const { currentTheme } = get()
    get().applyTheme(currentTheme, resolved)

    // 設定ファイルに保存
    try {
      await window.electronAPI.saveSettings({ themeMode: mode })
    } catch (error) {
      console.error('Failed to save theme mode:', error)
    }
  },

  initializeTheme: async () => {
    try {
      const settings = await window.electronAPI.loadSettings()
      const themeId = (settings?.themeId as ThemeId) || 'dark'
      const mode = (settings?.themeMode as ThemeMode) || 'dark'
      const resolved = resolveMode(mode)
      const theme = themes[themeId] || themes.dark

      set({
        currentThemeId: themeId,
        currentTheme: theme,
        mode,
        resolvedMode: resolved,
        isLoading: false,
      })
      get().applyTheme(theme, resolved)

      // システムモードの変更を監視
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = (e: MediaQueryListEvent) => {
          const { mode: currentMode, currentTheme } = get()
          if (currentMode === 'system') {
            const newResolved = e.matches ? 'dark' : 'light'
            set({ resolvedMode: newResolved })
            get().applyTheme(currentTheme, newResolved)
          }
        }
        mediaQuery.addEventListener('change', handler)
      }
    } catch (error) {
      console.error('Failed to load theme settings:', error)
      set({ isLoading: false })
      get().applyTheme(themes.dark, 'dark')
    }
  },

  applyTheme: (theme, mode) => {
    const root = document.documentElement
    // モードに応じた色セットを選択
    const colors: ThemeColors = theme[mode]
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })
  },
}))
