import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { execSync } from 'child_process'
import os from 'os'
import { ptyManager } from './services/ptyManager'
import { createDropdownWindow, getDropdownTargetY, getDropdownHiddenY } from './dropdownWindow'
import { dropdownAnimator } from './services/dropdownAnimator'
import { scanProjects, refreshProjects } from './services/projectScanner'
import { readPackageScripts } from './services/packageReader'
import {
  loadCommands,
  addCommand,
  toggleFavorite,
  getCommandsByProject,
  getFavorites,
} from './services/commandStorage'
import { getCompletion, type CompletionRequest } from './services/completionService'
import { loadSettings, saveSettings, type Settings } from './services/settingsStorage'
import { initUpdater, setupUpdaterIpc } from './services/updater'
import { hooksServer, hookEventToState } from './services/hooksServer'
import { hooksConfigManager } from './services/hooksConfigManager'
import { claudeStateDetector } from './services/claudeStateDetector'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let dropdownWindow: BrowserWindow | null = null
let isDropdownVisible = false

const DROPDOWN_SESSION_ID = 'dropdown-terminal'
const DROPDOWN_HEIGHT = 400
const ANIMATION_DURATION = 200

async function toggleDropdownTerminal() {
  if (!dropdownWindow) return

  if (isDropdownVisible) {
    // Hide
    isDropdownVisible = false
    await dropdownAnimator.slideOut(dropdownWindow, getDropdownHiddenY(DROPDOWN_HEIGHT), ANIMATION_DURATION)
  } else {
    // Show on current space by toggling visibleOnAllWorkspaces
    dropdownWindow.setVisibleOnAllWorkspaces(false)
    dropdownWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    isDropdownVisible = true
    await dropdownAnimator.slideIn(dropdownWindow, getDropdownTargetY(), ANIMATION_DURATION)
    dropdownWindow.focus()
  }
}

function createDropdown(appPath: string) {
  const preloadPath = path.join(appPath, 'dist-electron/preload.js')
  dropdownWindow = createDropdownWindow(preloadPath, { height: DROPDOWN_HEIGHT })

  ptyManager.setDropdownWindow(dropdownWindow)

  // Load same UI as main window with dropdown flag
  if (process.env.VITE_DEV_SERVER_URL) {
    dropdownWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?dropdown=true`)
  } else {
    dropdownWindow.loadFile(path.join(appPath, 'dist/index.html'), {
      query: { dropdown: 'true' }
    })
  }

  // Handle dropdown blur - hide when clicking outside
  dropdownWindow.on('blur', () => {
    if (isDropdownVisible) {
      isDropdownVisible = false
      dropdownAnimator.slideOut(dropdownWindow!, getDropdownHiddenY(DROPDOWN_HEIGHT), ANIMATION_DURATION)
    }
  })
}

function registerGlobalShortcuts() {
  // Cmd+. to toggle dropdown terminal
  globalShortcut.register('CommandOrControl+.', () => {
    toggleDropdownTerminal()
  })
}

function createWindow() {
  // app.getAppPath() returns the correct path both in dev and production
  const appPath = app.isPackaged ? app.getAppPath() : path.join(__dirname, '..')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#252526',
    webPreferences: {
      preload: path.join(appPath, 'dist-electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  ptyManager.setMainWindow(mainWindow)

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(appPath, 'dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    ptyManager.setMainWindow(null)
  })
}

app.whenReady().then(async () => {
  const appPath = app.isPackaged ? app.getAppPath() : path.join(__dirname, '..')

  createWindow()
  createDropdown(appPath)
  registerGlobalShortcuts()
  setupUpdaterIpc()

  // Start hooks server for Claude Code integration
  try {
    await hooksServer.start()
    // Set up hooks event handler
    hooksServer.onHookEvent((event) => {
      const state = hookEventToState(event)
      if (state && event.cwd) {
        claudeStateDetector.updateFromHooks(event.cwd, state)
      }
    })
    console.log('[Main] Hooks server started')
  } catch (e) {
    console.error('[Main] Failed to start hooks server:', e)
  }

  // Initialize auto-updater (only in production)
  if (app.isPackaged && mainWindow) {
    initUpdater(mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  ptyManager.destroyAll()
  hooksServer.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  hooksServer.stop()
})

// Project IPC handlers
ipcMain.handle('projects:scan', async () => {
  return scanProjects()
})

ipcMain.handle('projects:refresh', async () => {
  return refreshProjects()
})

// Session IPC handlers
ipcMain.handle('session:create', async (event, _projectId: string, cwd: string) => {
  const sessionId = randomUUID()
  ptyManager.create(sessionId, cwd, event.sender)
  return sessionId
})

ipcMain.handle('session:destroy', async (_event, sessionId: string) => {
  ptyManager.destroy(sessionId)
})

ipcMain.on('session:write', (_event, sessionId: string, data: string) => {
  ptyManager.write(sessionId, data)
})

ipcMain.on('session:resize', (_event, sessionId: string, cols: number, rows: number) => {
  ptyManager.resize(sessionId, cols, rows)
})

// Project info IPC
ipcMain.handle('project:info', async (_event, projectPath: string) => {
  const homeDir = os.homedir()
  const relativePath = projectPath.startsWith(homeDir)
    ? '~' + projectPath.slice(homeDir.length)
    : projectPath

  let nodeVersion = ''
  let gitBranch = ''

  try {
    nodeVersion = execSync('node -v', { cwd: projectPath, encoding: 'utf-8', timeout: 3000 }).trim()
  } catch {}

  try {
    gitBranch = execSync('git branch --show-current', { cwd: projectPath, encoding: 'utf-8', timeout: 3000 }).trim()
  } catch {}

  return {
    relativePath,
    nodeVersion,
    gitBranch,
  }
})

// Scripts IPC handlers
ipcMain.handle('scripts:read', async (_event, projectPath: string) => {
  return readPackageScripts(projectPath)
})

ipcMain.handle('scripts:run', async (_event, sessionId: string, scriptName: string, packageManager: string) => {
  const command = `${packageManager} run ${scriptName}\n`
  ptyManager.write(sessionId, command)
})

ipcMain.handle('server:stop', async (_event, sessionId: string) => {
  // Send Ctrl+C to stop the process
  ptyManager.write(sessionId, '\x03')
})

// Commands IPC handlers
ipcMain.handle('commands:load', async () => {
  return loadCommands()
})

ipcMain.handle('commands:add', async (_event, command: string, projectPath: string) => {
  return addCommand(command, projectPath)
})

ipcMain.handle('commands:toggle-favorite', async (_event, command: string, projectPath: string) => {
  return toggleFavorite(command, projectPath)
})

ipcMain.handle('commands:by-project', async (_event, projectPath: string) => {
  return getCommandsByProject(projectPath)
})

ipcMain.handle('commands:favorites', async () => {
  return getFavorites()
})

// Dropdown IPC handlers
ipcMain.handle('dropdown:create-session', async (_event, cwd: string) => {
  ptyManager.createDropdownSession(DROPDOWN_SESSION_ID, cwd)
  return DROPDOWN_SESSION_ID
})

ipcMain.handle('dropdown:toggle', async () => {
  toggleDropdownTerminal()
})

ipcMain.on('dropdown:write', (_event, data: string) => {
  ptyManager.writeDropdown(DROPDOWN_SESSION_ID, data)
})

ipcMain.on('dropdown:resize', (_event, cols: number, rows: number) => {
  ptyManager.resizeDropdown(DROPDOWN_SESSION_ID, cols, rows)
})

ipcMain.handle('dropdown:get-session-id', async () => {
  return DROPDOWN_SESSION_ID
})

// Settings IPC handlers
ipcMain.handle('settings:load', async () => {
  return loadSettings()
})

ipcMain.handle('settings:save', async (_event, settings: Partial<Settings>) => {
  return saveSettings(settings)
})

// Completion IPC handler
ipcMain.handle('completion:get', async (_event, request: CompletionRequest) => {
  return getCompletion(request)
})

// Hooks IPC handlers
ipcMain.handle('hooks:check-status', async () => {
  return hooksConfigManager.checkStatus()
})

ipcMain.handle('hooks:setup', async () => {
  return hooksConfigManager.setupAll()
})

ipcMain.handle('hooks:get-paths', async () => {
  return hooksConfigManager.getPaths()
})

ipcMain.handle('hooks:remove', async () => {
  hooksConfigManager.removeHooksFromSettings()
  return { success: true }
})
