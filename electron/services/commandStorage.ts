import fs from 'fs'
import path from 'path'
import os from 'os'

const CLAUDECK_DIR = path.join(os.homedir(), '.claudeck')
const COMMANDS_FILE = path.join(CLAUDECK_DIR, 'commands.json')
const MAX_ENTRIES_PER_PROJECT = 500

export interface CommandEntry {
  command: string
  count: number
  lastUsed: number
  projectPath: string
  isFavorite: boolean
}

export interface CommandData {
  version: 1
  entries: CommandEntry[]
}

function ensureDir() {
  if (!fs.existsSync(CLAUDECK_DIR)) {
    fs.mkdirSync(CLAUDECK_DIR, { recursive: true })
  }
}

export function loadCommands(): CommandData {
  ensureDir()

  if (!fs.existsSync(COMMANDS_FILE)) {
    return { version: 1, entries: [] }
  }

  try {
    const content = fs.readFileSync(COMMANDS_FILE, 'utf-8')
    return JSON.parse(content) as CommandData
  } catch (error) {
    console.error('Failed to load commands:', error)
    return { version: 1, entries: [] }
  }
}

export function saveCommands(data: CommandData): void {
  ensureDir()

  try {
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save commands:', error)
  }
}

export function addCommand(command: string, projectPath: string): CommandData {
  const data = loadCommands()

  // Skip empty commands or just whitespace
  const trimmedCmd = command.trim()
  if (!trimmedCmd) return data

  // Find existing entry
  const existingIndex = data.entries.findIndex(
    (e) => e.command === trimmedCmd && e.projectPath === projectPath
  )

  if (existingIndex >= 0) {
    // Update existing
    data.entries[existingIndex].count++
    data.entries[existingIndex].lastUsed = Date.now()
  } else {
    // Add new entry
    data.entries.push({
      command: trimmedCmd,
      count: 1,
      lastUsed: Date.now(),
      projectPath,
      isFavorite: false,
    })
  }

  // Enforce limit per project (keep favorites and recent ones)
  const projectEntries = data.entries.filter((e) => e.projectPath === projectPath)
  if (projectEntries.length > MAX_ENTRIES_PER_PROJECT) {
    const sorted = projectEntries
      .filter((e) => !e.isFavorite)
      .sort((a, b) => {
        // Sort by count descending, then by lastUsed descending
        if (b.count !== a.count) return b.count - a.count
        return b.lastUsed - a.lastUsed
      })

    const toRemove = sorted.slice(MAX_ENTRIES_PER_PROJECT - projectEntries.filter((e) => e.isFavorite).length)
    const removeSet = new Set(toRemove.map((e) => e.command))
    data.entries = data.entries.filter(
      (e) => e.projectPath !== projectPath || !removeSet.has(e.command) || e.isFavorite
    )
  }

  saveCommands(data)
  return data
}

export function toggleFavorite(command: string, projectPath: string): CommandData {
  const data = loadCommands()

  const entry = data.entries.find(
    (e) => e.command === command && e.projectPath === projectPath
  )

  if (entry) {
    entry.isFavorite = !entry.isFavorite
    saveCommands(data)
  }

  return data
}

export function getCommandsByProject(projectPath: string): CommandEntry[] {
  const data = loadCommands()
  return data.entries.filter((e) => e.projectPath === projectPath)
}

export function getFavorites(): CommandEntry[] {
  const data = loadCommands()
  return data.entries.filter((e) => e.isFavorite)
}
