const { contextBridge, ipcRenderer } = require('electron')

// Global callback registries - allows multiple components to subscribe
type DataCallback = (sessionId: string, data: string) => void
type ExitCallback = (sessionId: string, exitCode: number) => void
type CwdCallback = (sessionId: string, cwd: string) => void
type PortCallback = (sessionId: string, port: number) => void
type PortClearCallback = (sessionId: string) => void

const dataCallbacks: Set<DataCallback> = new Set()
const exitCallbacks: Set<ExitCallback> = new Set()
const cwdCallbacks: Set<CwdCallback> = new Set()
const portCallbacks: Set<PortCallback> = new Set()
const portClearCallbacks: Set<PortClearCallback> = new Set()

// Dropdown callbacks
const dropdownDataCallbacks: Set<DataCallback> = new Set()
const dropdownCwdCallbacks: Set<CwdCallback> = new Set()
const dropdownExitCallbacks: Set<ExitCallback> = new Set()

// Set up global listeners once
let listenersInitialized = false

function initializeListeners() {
  if (listenersInitialized) return
  listenersInitialized = true

  ipcRenderer.on('session:data', (_event: unknown, sessionId: string, data: string) => {
    dataCallbacks.forEach(cb => cb(sessionId, data))
  })

  ipcRenderer.on('session:exit', (_event: unknown, sessionId: string, exitCode: number) => {
    exitCallbacks.forEach(cb => cb(sessionId, exitCode))
  })

  ipcRenderer.on('session:cwd', (_event: unknown, sessionId: string, cwd: string) => {
    cwdCallbacks.forEach(cb => cb(sessionId, cwd))
  })

  ipcRenderer.on('session:port', (_event: unknown, sessionId: string, port: number) => {
    portCallbacks.forEach(cb => cb(sessionId, port))
  })

  ipcRenderer.on('session:port-clear', (_event: unknown, sessionId: string) => {
    portClearCallbacks.forEach(cb => cb(sessionId))
  })

  // Dropdown listeners
  ipcRenderer.on('dropdown:data', (_event: unknown, sessionId: string, data: string) => {
    dropdownDataCallbacks.forEach(cb => cb(sessionId, data))
  })

  ipcRenderer.on('dropdown:cwd', (_event: unknown, sessionId: string, cwd: string) => {
    dropdownCwdCallbacks.forEach(cb => cb(sessionId, cwd))
  })

  ipcRenderer.on('dropdown:exit', (_event: unknown, sessionId: string, exitCode: number) => {
    dropdownExitCallbacks.forEach(cb => cb(sessionId, exitCode))
  })
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Projects
  scanProjects: () => ipcRenderer.invoke('projects:scan'),
  refreshProjects: () => ipcRenderer.invoke('projects:refresh'),
  onProjectsUpdated: (callback: (projects: unknown[]) => void) => {
    ipcRenderer.removeAllListeners('projects:updated')
    ipcRenderer.on('projects:updated', (_event: unknown, projects: unknown[]) => callback(projects))
  },

  // Sessions
  createSession: (projectId: string, cwd: string) =>
    ipcRenderer.invoke('session:create', projectId, cwd),
  destroySession: (sessionId: string) =>
    ipcRenderer.invoke('session:destroy', sessionId),
  writeSession: (sessionId: string, data: string) =>
    ipcRenderer.send('session:write', sessionId, data),
  resizeSession: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.send('session:resize', sessionId, cols, rows),
  onSessionData: (callback: DataCallback) => {
    initializeListeners()
    dataCallbacks.add(callback)
    // Return unsubscribe function
    return () => dataCallbacks.delete(callback)
  },
  onSessionExit: (callback: ExitCallback) => {
    initializeListeners()
    exitCallbacks.add(callback)
    return () => exitCallbacks.delete(callback)
  },
  onSessionCwd: (callback: CwdCallback) => {
    initializeListeners()
    cwdCallbacks.add(callback)
    return () => cwdCallbacks.delete(callback)
  },
  onSessionPort: (callback: PortCallback) => {
    initializeListeners()
    portCallbacks.add(callback)
    return () => portCallbacks.delete(callback)
  },
  onSessionPortClear: (callback: PortClearCallback) => {
    initializeListeners()
    portClearCallbacks.add(callback)
    return () => portClearCallbacks.delete(callback)
  },

  // Project info
  getProjectInfo: (projectPath: string) => ipcRenderer.invoke('project:info', projectPath),

  // Scripts
  readScripts: (projectPath: string) => ipcRenderer.invoke('scripts:read', projectPath),
  runScript: (sessionId: string, scriptName: string, packageManager: string) =>
    ipcRenderer.invoke('scripts:run', sessionId, scriptName, packageManager),
  stopServer: (sessionId: string) => ipcRenderer.invoke('server:stop', sessionId),

  // Commands
  loadCommands: () => ipcRenderer.invoke('commands:load'),
  addCommand: (command: string, projectPath: string) =>
    ipcRenderer.invoke('commands:add', command, projectPath),
  toggleFavorite: (command: string, projectPath: string) =>
    ipcRenderer.invoke('commands:toggle-favorite', command, projectPath),
  getCommandsByProject: (projectPath: string) =>
    ipcRenderer.invoke('commands:by-project', projectPath),
  getFavorites: () => ipcRenderer.invoke('commands:favorites'),

  // Dropdown
  createDropdownSession: (cwd: string) =>
    ipcRenderer.invoke('dropdown:create-session', cwd),
  toggleDropdown: () => ipcRenderer.invoke('dropdown:toggle'),
  getDropdownSessionId: () => ipcRenderer.invoke('dropdown:get-session-id'),
  writeDropdownSession: (data: string) =>
    ipcRenderer.send('dropdown:write', data),
  resizeDropdownSession: (cols: number, rows: number) =>
    ipcRenderer.send('dropdown:resize', cols, rows),
  onDropdownData: (callback: DataCallback) => {
    initializeListeners()
    dropdownDataCallbacks.add(callback)
    return () => dropdownDataCallbacks.delete(callback)
  },
  onDropdownCwd: (callback: CwdCallback) => {
    initializeListeners()
    dropdownCwdCallbacks.add(callback)
    return () => dropdownCwdCallbacks.delete(callback)
  },
  onDropdownExit: (callback: ExitCallback) => {
    initializeListeners()
    dropdownExitCallbacks.add(callback)
    return () => dropdownExitCallbacks.delete(callback)
  },

  // Settings
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:save', settings),

  // Updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  getVersion: () => ipcRenderer.invoke('updater:get-version'),
  onUpdateChecking: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('updater:checking', handler)
    return () => ipcRenderer.removeListener('updater:checking', handler)
  },
  onUpdateAvailable: (callback: (info: unknown) => void) => {
    const handler = (_event: unknown, info: unknown) => callback(info)
    ipcRenderer.on('updater:available', handler)
    return () => ipcRenderer.removeListener('updater:available', handler)
  },
  onUpdateNotAvailable: (callback: (info: unknown) => void) => {
    const handler = (_event: unknown, info: unknown) => callback(info)
    ipcRenderer.on('updater:not-available', handler)
    return () => ipcRenderer.removeListener('updater:not-available', handler)
  },
  onUpdateProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: unknown, progress: unknown) => callback(progress)
    ipcRenderer.on('updater:progress', handler)
    return () => ipcRenderer.removeListener('updater:progress', handler)
  },
  onUpdateDownloaded: (callback: (info: unknown) => void) => {
    const handler = (_event: unknown, info: unknown) => callback(info)
    ipcRenderer.on('updater:downloaded', handler)
    return () => ipcRenderer.removeListener('updater:downloaded', handler)
  },
  onUpdateError: (callback: (error: string) => void) => {
    const handler = (_event: unknown, error: string) => callback(error)
    ipcRenderer.on('updater:error', handler)
    return () => ipcRenderer.removeListener('updater:error', handler)
  },
})
