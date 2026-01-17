import { create } from 'zustand'
import type { DropdownSettings, ShortcutSettings } from '../types'
import { DEFAULT_DROPDOWN_SETTINGS, DEFAULT_SHORTCUT_SETTINGS } from '../types'

interface SettingsState {
  dropdown: DropdownSettings
  shortcuts: ShortcutSettings
  isLoading: boolean

  initialize: () => Promise<void>
  updateDropdown: (opts: Partial<DropdownSettings>) => Promise<void>
  updateShortcuts: (shortcuts: ShortcutSettings) => Promise<{ success: boolean; error?: string }>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  dropdown: DEFAULT_DROPDOWN_SETTINGS,
  shortcuts: DEFAULT_SHORTCUT_SETTINGS,
  isLoading: true,

  initialize: async () => {
    try {
      const settings = await window.electronAPI.loadSettings()
      set({
        isLoading: false,
        dropdown: settings.dropdown || DEFAULT_DROPDOWN_SETTINGS,
        shortcuts: settings.shortcuts || DEFAULT_SHORTCUT_SETTINGS,
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
      set({ isLoading: false })
    }
  },

  updateDropdown: async (opts) => {
    const current = get().dropdown
    const updated = { ...current, ...opts }
    set({ dropdown: updated })
    await window.electronAPI.updateDropdownStyle(updated)
  },

  updateShortcuts: async (shortcuts) => {
    const result = await window.electronAPI.updateShortcuts(shortcuts)
    if (result.success) {
      set({ shortcuts })
    }
    return result
  },
}))
