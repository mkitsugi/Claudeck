import os from 'os'
import fs from 'fs'
import pty from 'node-pty'
import type { BrowserWindow, WebContents } from 'electron'

// Determine shell path - prefer existing shell, fallback to common paths
function getShellPath(): string {
  if (os.platform() === 'win32') {
    return 'powershell.exe'
  }

  // Check process.env.SHELL first
  const envShell = process.env.SHELL
  if (envShell && fs.existsSync(envShell)) {
    console.log(`[PtyManager] Using shell from env: ${envShell}`)
    return envShell
  }

  // Fallback to common shell paths
  const commonShells = ['/bin/zsh', '/usr/bin/zsh', '/bin/bash', '/usr/bin/bash', '/bin/sh', '/usr/bin/sh']
  for (const shellPath of commonShells) {
    if (fs.existsSync(shellPath)) {
      console.log(`[PtyManager] Using fallback shell: ${shellPath}`)
      return shellPath
    }
  }

  // /bin/sh should always exist on Unix-like systems
  console.error('[PtyManager] No shell found! Checked:', commonShells, 'SHELL env:', envShell)
  return '/bin/sh'
}

const shell = getShellPath()

interface PtySession {
  id: string
  pty: pty.IPty
  cwd: string
  webContents: WebContents
}

interface DropdownPtySession {
  id: string
  pty: pty.IPty
  cwd: string
}

class PtyManager {
  private sessions: Map<string, PtySession> = new Map()
  private dropdownWindow: BrowserWindow | null = null
  private dropdownSessions: Map<string, DropdownPtySession> = new Map()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setMainWindow(_window: BrowserWindow | null) {
    // No longer needed - sessions now track their own webContents
  }

  setDropdownWindow(window: BrowserWindow | null) {
    this.dropdownWindow = window
  }

  create(sessionId: string, cwd: string, webContents: WebContents): void {
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
      // Locale settings for proper UTF-8 handling (especially important for production builds)
      LANG: process.env.LANG || 'en_US.UTF-8',
      LC_ALL: process.env.LC_ALL || 'en_US.UTF-8',
      LC_CTYPE: process.env.LC_CTYPE || 'UTF-8',
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
# Send git branch via OSC 9999 (custom)
precmd() {
  printf '\\033]7;file://%s%s\\033\\\\' "\${HOST}" "\${PWD}"
  local branch
  branch=\$(git branch --show-current 2>/dev/null)
  if [[ -n "\$branch" ]]; then
    printf '\\033]9999;%s\\033\\\\' "\$branch"
  else
    printf '\\033]9999;\\033\\\\'
  fi
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
      if (!webContents.isDestroyed()) {
        // Parse OSC 7 for current directory
        // Format: \e]7;file://hostname/path\a or \e]7;file://hostname/path\e\\
        const osc7Match = data.match(/\x1b\]7;file:\/\/[^\/]*(\/[^\x07\x1b]*)(?:\x07|\x1b\\)/)
        if (osc7Match) {
          const currentDir = decodeURIComponent(osc7Match[1])
          webContents.send('session:cwd', sessionId, currentDir)
        }

        // Parse OSC 9999 for git branch
        // Format: \e]9999;branchname\e\\
        const osc9999Match = data.match(/\x1b\]9999;([^\x07\x1b]*)(?:\x07|\x1b\\)/)
        if (osc9999Match) {
          const gitBranch = osc9999Match[1] || ''
          webContents.send('session:git-branch', sessionId, gitBranch)
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
              webContents.send('session:port', sessionId, port)
            }
          }
        }

        webContents.send('session:data', sessionId, data)
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      console.log(`PTY ${sessionId} exited with code ${exitCode}`)
      if (!webContents.isDestroyed()) {
        webContents.send('session:exit', sessionId, exitCode)
      }
      this.sessions.delete(sessionId)
    })

    this.sessions.set(sessionId, {
      id: sessionId,
      pty: ptyProcess,
      cwd,
      webContents,
    })
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      // Detect Ctrl+C and notify to clear ports
      if (data === '\x03' && !session.webContents.isDestroyed()) {
        session.webContents.send('session:port-clear', sessionId)
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
      // Locale settings for proper UTF-8 handling (especially important for production builds)
      LANG: process.env.LANG || 'en_US.UTF-8',
      LC_ALL: process.env.LC_ALL || 'en_US.UTF-8',
      LC_CTYPE: process.env.LC_CTYPE || 'UTF-8',
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
  local branch
  branch=\$(git branch --show-current 2>/dev/null)
  if [[ -n "\$branch" ]]; then
    printf '\\033]9999;%s\\033\\\\' "\$branch"
  else
    printf '\\033]9999;\\033\\\\'
  fi
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

        // Parse OSC 9999 for git branch
        const osc9999Match = data.match(/\x1b\]9999;([^\x07\x1b]*)(?:\x07|\x1b\\)/)
        if (osc9999Match) {
          const gitBranch = osc9999Match[1] || ''
          this.dropdownWindow.webContents.send('dropdown:git-branch', sessionId, gitBranch)
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
