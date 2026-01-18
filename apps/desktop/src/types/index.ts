export interface Project {
  id: string
  name: string
  path: string
  type: 'claude-dir' | 'claude-md'
  isWorktree: boolean
  parentProject?: string
  parentType?: 'worktree' | 'path'  // 親子関係の種類
  branch?: string
  worktrees?: Worktree[]
}

export interface Worktree {
  path: string
  branch?: string
  isMain: boolean
}

export interface Session {
  id: string
  projectId: string
  name: string
  cwd: string
  createdAt: number
  isActive: boolean
}

export interface ProjectInfo {
  relativePath: string
  nodeVersion: string
  gitBranch: string
}

export type PackageManager = 'npm' | 'bun' | 'pnpm' | 'yarn'

// Claude Code state detection
export type ClaudeState = 'idle' | 'processing' | 'waiting-input'
export type DetectionSource = 'hooks' | 'pattern' | 'initial'

export interface ClaudeStateInfo {
  state: ClaudeState
  isClaudeActive: boolean
  detectionSource?: DetectionSource
}

// Hooks configuration types
export interface HooksStatus {
  isConfigured: boolean
  hasScript: boolean
  hasSettings: boolean
  missingHooks: string[]
}

export interface HooksPaths {
  script: string
  settings: string
  hooksDir: string
}

export interface ScriptsInfo {
  scripts: Record<string, string>
  packageManager: PackageManager
}

export interface ElectronAPI {
  // Projects
  scanProjects: () => Promise<Project[]>
  refreshProjects: () => Promise<Project[]>
  onProjectsUpdated: (callback: (projects: Project[]) => void) => void
  getProjectInfo: (projectPath: string) => Promise<ProjectInfo>

  // Sessions
  createSession: (projectId: string, cwd: string) => Promise<string>
  destroySession: (sessionId: string) => Promise<void>
  writeSession: (sessionId: string, data: string) => void
  resizeSession: (sessionId: string, cols: number, rows: number) => void
  onSessionData: (callback: (sessionId: string, data: string) => void) => () => void
  onSessionExit: (callback: (sessionId: string, exitCode: number) => void) => () => void
  onSessionCwd: (callback: (sessionId: string, cwd: string) => void) => () => void
  onSessionPort: (callback: (sessionId: string, port: number) => void) => () => void
  onSessionPortClear: (callback: (sessionId: string) => void) => () => void
  onSessionGitBranch: (callback: (sessionId: string, branch: string) => void) => () => void
  onSessionClaudeState: (callback: (sessionId: string, state: ClaudeState, isClaudeActive: boolean) => void) => () => void

  // Scripts
  readScripts: (projectPath: string) => Promise<ScriptsInfo>
  runScript: (sessionId: string, scriptName: string, packageManager: string) => Promise<void>
  stopServer: (sessionId: string) => Promise<void>

  // Commands
  loadCommands: () => Promise<CommandData>
  addCommand: (command: string, projectPath: string) => Promise<CommandData>
  toggleFavorite: (command: string, projectPath: string) => Promise<CommandData>
  getCommandsByProject: (projectPath: string) => Promise<CommandEntry[]>
  getFavorites: () => Promise<CommandEntry[]>

  // Dropdown
  createDropdownSession: (cwd: string) => Promise<string>
  toggleDropdown: () => Promise<void>
  getDropdownSessionId: () => Promise<string>
  writeDropdownSession: (data: string) => void
  resizeDropdownSession: (cols: number, rows: number) => void
  onDropdownData: (callback: (sessionId: string, data: string) => void) => () => void
  onDropdownCwd: (callback: (sessionId: string, cwd: string) => void) => () => void
  onDropdownExit: (callback: (sessionId: string, exitCode: number) => void) => () => void
  onDropdownGitBranch: (callback: (sessionId: string, branch: string) => void) => () => void
  onDropdownClaudeState: (callback: (sessionId: string, state: ClaudeState, isClaudeActive: boolean) => void) => () => void

  // Settings
  loadSettings: () => Promise<Settings>
  saveSettings: (settings: Partial<Settings>) => Promise<Settings>
  updateDropdownStyle: (opts: { opacity: number; blur: number }) => Promise<void>
  previewDropdownStyle: (opts: { opacity: number; blur: number }) => Promise<void>
  updateShortcuts: (shortcuts: ShortcutSettings) => Promise<{ success: boolean; error?: string }>
  onShortcutsUpdated: (callback: (shortcuts: ShortcutSettings) => void) => () => void
  onDropdownStyleUpdate: (callback: (opts: { opacity: number; blur: number }) => void) => () => void

  // Completion
  getCompletion: (request: CompletionRequest) => Promise<CompletionResult>

  // Updater
  checkForUpdates: () => Promise<UpdateCheckResult | null>
  downloadUpdate: () => Promise<void>
  installUpdate: () => void
  getVersion: () => Promise<string>
  onUpdateChecking: (callback: () => void) => () => void
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
  onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => () => void
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void
  onUpdateError: (callback: (error: string) => void) => () => void

  // Hooks
  checkHooksStatus: () => Promise<HooksStatus>
  setupHooks: () => Promise<{ success: boolean; error?: string }>
  getHooksPaths: () => Promise<HooksPaths>
  removeHooks: () => Promise<{ success: boolean }>
}

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

// Dropdown settings
export interface DropdownSettings {
  opacity: number  // 0-100 (%)
  blur: number     // 0-50 (px)
}

export const DEFAULT_DROPDOWN_SETTINGS: DropdownSettings = {
  opacity: 92,
  blur: 20,
}

// Shortcut settings
export interface ShortcutSettings {
  toggleDropdown: string
  commandPalette: string
  commandHistory: string
  toggleSidebar: string
}

export const DEFAULT_SHORTCUT_SETTINGS: ShortcutSettings = {
  toggleDropdown: 'CommandOrControl+.',
  commandPalette: 'Meta+K',
  commandHistory: 'Meta+H',
  toggleSidebar: 'Meta+B',
}

export interface Settings {
  version: 1
  themeId: string
  themeMode?: 'light' | 'dark' | 'system'
  dropdown?: DropdownSettings
  shortcuts?: ShortcutSettings
}

export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
}

export interface UpdateProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

export interface UpdateCheckResult {
  updateInfo: UpdateInfo
}

export interface CompletionRequest {
  input: string
  cwd: string
  projectPath: string
}

export type CompletionType = 'path' | 'history' | 'git' | 'command' | null

export interface CompletionResult {
  suggestion: string | null
  type: CompletionType
  completion: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
