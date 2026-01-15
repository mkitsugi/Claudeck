import os from 'os'
import fs from 'fs'
import pty from 'node-pty'
import type { BrowserWindow } from 'electron'

// Determine shell path - prefer existing shell, fallback to common paths
function getShellPath(): string {
  if (os.platform() === 'win32') {
    return 'powershell.exe'
  }

  // Check process.env.SHELL first
  const envShell = process.env.SHELL
  if (envShell && fs.existsSync(envShell)) {
    return envShell
  }

  // Fallback to common shell paths
  const commonShells = ['/bin/zsh', '/usr/bin/zsh', '/bin/bash', '/usr/bin/bash', '/bin/sh']
  for (const shellPath of commonShells) {
    if (fs.existsSync(shellPath)) {
      return shellPath
    }
  }

  return '/bin/zsh' // Last resort
}

const shell = getShellPath()

interface PtySession {
  id: string
  pty: pty.IPty
  cwd: string
}

class PtyManager {
  private sessions: Map<string, PtySession> = new Map()
  private mainWindow: BrowserWindow | null = null
  private dropdownWindow: BrowserWindow | null = null
  private dropdownSessions: Map<string, PtySession> = new Map()

  setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window
  }

  setDropdownWindow(window: BrowserWindow | null) {
    this.dropdownWindow = window
  }

  create(sessionId: string, cwd: string): void {
    // Minimal prompt - just >
    // Skip loading user's zshrc to avoid prompt override
    // Remove PATH from process.env to let shell inherit user's PATH from .zshrc/.zprofile
    const { PATH: _ignoredPath, ...envWithoutPath } = process.env
    const customEnv = {
      ...envWithoutPath,
      ZDOTDIR: '/tmp/ccport-zsh',
      PS1: '> ',
      PROMPT: '> ',
      // Minimal PATH - just system essentials, user's PATH will be set by their shell config
      PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
    } as { [key: string]: string }

    // Create zshrc that loads user config then overrides prompt
    const zshDir = '/tmp/ccport-zsh'
    const homeDir = os.homedir()
    fs.mkdirSync(zshDir, { recursive: true })
    // Create symlink for claude if it exists
    const claudeLocalPath = `${homeDir}/.claude/local/claude`
    const claudeSymlinkPath = `${zshDir}/bin/claude`
    const binDir = `${zshDir}/bin`
    fs.mkdirSync(binDir, { recursive: true })
    try {
      if (fs.existsSync(claudeLocalPath)) {
        if (fs.existsSync(claudeSymlinkPath)) {
          fs.unlinkSync(claudeSymlinkPath)
        }
        fs.symlinkSync(claudeLocalPath, claudeSymlinkPath)
      }
    } catch (e) {
      // Ignore symlink errors
    }

    fs.writeFileSync(`${zshDir}/.zshrc`, `
# Load user's zprofile for PATH, aliases, etc.
[[ -f "${homeDir}/.zprofile" ]] && source "${homeDir}/.zprofile" 2>/dev/null

# Load user's zshrc for PATH and other settings
[[ -f "${homeDir}/.zshrc" ]] && source "${homeDir}/.zshrc" 2>/dev/null

# Add claude symlink to PATH (before user's PATH)
export PATH="${zshDir}/bin:\$PATH"

# Override prompt to be minimal
PROMPT="> "

# Send current directory via OSC 7 on each command
precmd() {
  printf '\\033]7;file://%s%s\\033\\\\' "\${HOST}" "\${PWD}"
}
`)

    // Validate cwd exists, fallback to home directory
    const targetCwd = cwd && fs.existsSync(cwd) ? cwd : os.homedir()

    console.log(`Creating PTY session ${sessionId} with shell: ${shell}, cwd: ${targetCwd}`)

    let ptyProcess: pty.IPty
    try {
      ptyProcess = pty.spawn(shell, ['-i'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: targetCwd,
        env: customEnv,
      })
    } catch (error) {
      console.error(`Failed to spawn PTY: shell=${shell}, cwd=${targetCwd}`, error)
      throw new Error(`Failed to spawn shell "${shell}". Please ensure the shell exists and is executable.`)
    }

    ptyProcess.onData((data) => {
      if (this.mainWindow) {
        // Parse OSC 7 for current directory
        // Format: \e]7;file://hostname/path\a or \e]7;file://hostname/path\e\\
        const osc7Match = data.match(/\x1b\]7;file:\/\/[^\/]*(\/[^\x07\x1b]*)(?:\x07|\x1b\\)/)
        if (osc7Match) {
          const currentDir = decodeURIComponent(osc7Match[1])
          this.mainWindow.webContents.send('session:cwd', sessionId, currentDir)
        }

        // Detect running ports from output
        // Matches: localhost:3000, http://localhost:3000, http://127.0.0.1:5173, etc.
        const portPatterns = [
          /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/gi,
          /(?:listening|running|started|ready).*?(?:on\s+)?(?:port\s+)?(\d{4,5})/gi,
          /Local:\s+https?:\/\/[^:]+:(\d+)/gi,
        ]

        for (const pattern of portPatterns) {
          const matches = data.matchAll(pattern)
          for (const match of matches) {
            const port = parseInt(match[1], 10)
            if (port >= 1024 && port <= 65535) {
              this.mainWindow.webContents.send('session:port', sessionId, port)
            }
          }
        }

        this.mainWindow.webContents.send('session:data', sessionId, data)
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      console.log(`PTY ${sessionId} exited with code ${exitCode}`)
      if (this.mainWindow) {
        this.mainWindow.webContents.send('session:exit', sessionId, exitCode)
      }
      this.sessions.delete(sessionId)
    })

    this.sessions.set(sessionId, {
      id: sessionId,
      pty: ptyProcess,
      cwd,
    })
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      // Detect Ctrl+C and notify to clear ports
      if (data === '\x03' && this.mainWindow) {
        this.mainWindow.webContents.send('session:port-clear', sessionId)
      }
      session.pty.write(data)
    }
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.pty.resize(cols, rows)
    }
  }

  destroy(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.pty.kill()
      this.sessions.delete(sessionId)
    }
  }

  destroyAll(): void {
    for (const session of this.sessions.values()) {
      session.pty.kill()
    }
    this.sessions.clear()

    for (const session of this.dropdownSessions.values()) {
      session.pty.kill()
    }
    this.dropdownSessions.clear()
  }

  getSession(sessionId: string): PtySession | undefined {
    return this.sessions.get(sessionId)
  }

  // Dropdown session methods
  createDropdownSession(sessionId: string, cwd: string): void {
    // If session already exists, don't recreate
    if (this.dropdownSessions.has(sessionId)) {
      return
    }

    const { PATH: _ignoredPath, ...envWithoutPath } = process.env
    const customEnv = {
      ...envWithoutPath,
      ZDOTDIR: '/tmp/ccport-zsh',
      PS1: '> ',
      PROMPT: '> ',
      PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
    } as { [key: string]: string }

    const homeDir = os.homedir()
    const zshDir = '/tmp/ccport-zsh'
    fs.mkdirSync(zshDir, { recursive: true })

    const claudeLocalPath = `${homeDir}/.claude/local/claude`
    const claudeSymlinkPath = `${zshDir}/bin/claude`
    const binDir = `${zshDir}/bin`
    fs.mkdirSync(binDir, { recursive: true })
    try {
      if (fs.existsSync(claudeLocalPath)) {
        if (fs.existsSync(claudeSymlinkPath)) {
          fs.unlinkSync(claudeSymlinkPath)
        }
        fs.symlinkSync(claudeLocalPath, claudeSymlinkPath)
      }
    } catch (e) {
      // Ignore symlink errors
    }

    fs.writeFileSync(`${zshDir}/.zshrc`, `
[[ -f "${homeDir}/.zprofile" ]] && source "${homeDir}/.zprofile" 2>/dev/null
[[ -f "${homeDir}/.zshrc" ]] && source "${homeDir}/.zshrc" 2>/dev/null
export PATH="${zshDir}/bin:\$PATH"
PROMPT="> "
precmd() {
  printf '\\033]7;file://%s%s\\033\\\\' "\${HOST}" "\${PWD}"
}
`)

    // Validate cwd exists, fallback to home directory
    const targetCwd = cwd && fs.existsSync(cwd) ? cwd : os.homedir()

    console.log(`Creating dropdown PTY session ${sessionId} with shell: ${shell}, cwd: ${targetCwd}`)

    let ptyProcess: pty.IPty
    try {
      ptyProcess = pty.spawn(shell, ['-i'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: targetCwd,
        env: customEnv,
      })
    } catch (error) {
      console.error(`Failed to spawn dropdown PTY: shell=${shell}, cwd=${targetCwd}`, error)
      throw new Error(`Failed to spawn shell "${shell}". Please ensure the shell exists and is executable.`)
    }

    ptyProcess.onData((data) => {
      if (this.dropdownWindow) {
        const osc7Match = data.match(/\x1b\]7;file:\/\/[^\/]*(\/[^\x07\x1b]*)(?:\x07|\x1b\\)/)
        if (osc7Match) {
          const currentDir = decodeURIComponent(osc7Match[1])
          this.dropdownWindow.webContents.send('dropdown:cwd', sessionId, currentDir)
        }
        this.dropdownWindow.webContents.send('dropdown:data', sessionId, data)
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      console.log(`Dropdown PTY ${sessionId} exited with code ${exitCode}`)
      if (this.dropdownWindow) {
        this.dropdownWindow.webContents.send('dropdown:exit', sessionId, exitCode)
      }
      this.dropdownSessions.delete(sessionId)
    })

    this.dropdownSessions.set(sessionId, {
      id: sessionId,
      pty: ptyProcess,
      cwd,
    })
  }

  writeDropdown(sessionId: string, data: string): void {
    const session = this.dropdownSessions.get(sessionId)
    if (session) {
      session.pty.write(data)
    }
  }

  resizeDropdown(sessionId: string, cols: number, rows: number): void {
    const session = this.dropdownSessions.get(sessionId)
    if (session) {
      session.pty.resize(cols, rows)
    }
  }

  destroyDropdownSession(sessionId: string): void {
    const session = this.dropdownSessions.get(sessionId)
    if (session) {
      session.pty.kill()
      this.dropdownSessions.delete(sessionId)
    }
  }
}

export const ptyManager = new PtyManager()
