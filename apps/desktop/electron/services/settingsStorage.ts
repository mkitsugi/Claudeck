import fs from 'fs'
import path from 'path'
import os from 'os'

const CLAUDECK_DIR = path.join(os.homedir(), '.claudeck')
const SETTINGS_FILE = path.join(CLAUDECK_DIR, 'settings.json')

export interface DropdownSettings {
  opacity: number
  blur: number
}

export interface ShortcutSettings {
  toggleDropdown: string
  commandPalette: string
  commandHistory: string
  toggleSidebar: string
}

export interface Settings {
  version: 1
  themeId: string
  themeMode?: 'light' | 'dark' | 'system'
  dropdown?: DropdownSettings
  shortcuts?: ShortcutSettings
}

export const DEFAULT_DROPDOWN_SETTINGS: DropdownSettings = {
  opacity: 92,
  blur: 20,
}

export const DEFAULT_SHORTCUT_SETTINGS: ShortcutSettings = {
  toggleDropdown: 'CommandOrControl+.',
  commandPalette: 'Meta+K',
  commandHistory: 'Meta+H',
  toggleSidebar: 'Meta+B',
}

const DEFAULT_SETTINGS: Settings = {
  version: 1,
  themeId: 'dark',
  dropdown: DEFAULT_DROPDOWN_SETTINGS,
  shortcuts: DEFAULT_SHORTCUT_SETTINGS,
}

function ensureDir() {
  if (!fs.existsSync(CLAUDECK_DIR)) {
    fs.mkdirSync(CLAUDECK_DIR, { recursive: true })
  }
}

export function loadSettings(): Settings {
  ensureDir()

  if (!fs.existsSync(SETTINGS_FILE)) {
    return DEFAULT_SETTINGS
  }

  try {
    const content = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(content) }
  } catch (error) {
    console.error('Failed to load settings:', error)
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Partial<Settings>): Settings {
  ensureDir()

  const current = loadSettings()
  const updated = { ...current, ...settings }

  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save settings:', error)
  }

  return updated
}
