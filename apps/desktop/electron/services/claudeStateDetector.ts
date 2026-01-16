// Claude Code state detection service
export type ClaudeState = 'idle' | 'processing' | 'waiting-input'
export type DetectionSource = 'hooks' | 'pattern' | 'initial'

export interface ClaudeStateInfo {
  state: ClaudeState
  isClaudeActive: boolean
  detectionSource?: DetectionSource
}

interface SessionState {
  state: ClaudeState
  isClaudeActive: boolean
  lastActivityTime: number
  promptBuffer: string
  timeoutId: NodeJS.Timeout | null
  detectionSource: DetectionSource
  cwd: string // Track session cwd for hook matching
  lastHooksUpdate: number // Last time state was updated via hooks
  pendingClaudeExit: boolean // Waiting for shell prompt after Ctrl+C
}

type StateChangeCallback = (info: ClaudeStateInfo) => void

class ClaudeStateDetector {
  private sessions: Map<string, SessionState> = new Map()
  private stateChangeCallbacks: Map<string, StateChangeCallback> = new Map()

  // OSC 633 patterns (VSCode Shell Integration)
  private readonly OSC_633 = {
    PROMPT_START: /\x1b\]633;A(?:\x07|\x1b\\)/,
    PROMPT_END: /\x1b\]633;B(?:\x07|\x1b\\)/,
    COMMAND_START: /\x1b\]633;C(?:\x07|\x1b\\)/,
    COMMAND_END: /\x1b\]633;D(?:;\d+)?(?:\x07|\x1b\\)/,
  }

  // OSC 133 patterns (iTerm2/FinalTerm)
  private readonly OSC_133 = {
    PROMPT_START: /\x1b\]133;A(?:\x07|\x1b\\)/,
    COMMAND_START: /\x1b\]133;C(?:\x07|\x1b\\)/,
    COMMAND_END: /\x1b\]133;D(?:;\d+)?(?:\x07|\x1b\\)/,
  }

  // Synchronized output sequences (CSI ? 2026 h/l)
  private readonly SYNC_OUTPUT = {
    START: /\x1b\[\?2026h/,
    END: /\x1b\[\?2026l/,
  }

  // Claude Code specific patterns
  private readonly CLAUDE_PATTERNS = {
    // Claude Code main prompt: ❯
    CLAUDE_PROMPT: /❯\s*$/,
    // Shell prompt (not Claude): > or $
    SHELL_PROMPT: /(?:^|\n|\r)[\s]*[>$]\s*$/,
    // Input waiting patterns:
    // - ? at end of line (not just at very end, could be before options)
    // - (y/n) patterns
    // - Selection UI with various indicators
    // - Numbered choices [1], [2], etc.
    // - "Other" option (AskUserQuestion always has this)
    INPUT_WAITING: /\?\s*$|\?\s*\n|\(y\/n\)|\(Y\/n\)|Other\s*$/im,
    // Selection UI indicators - various Unicode circle/checkbox markers
    // Radio buttons: ○ ● ◯ ◉ ( ) (●) (○)
    // Checkboxes: ☐ ☑ ☒ □ ■ [ ] [x] [X]
    // Arrow indicators: > ❯ →
    SELECTION_UI: /[○●◯◉☐☑☒□■]|^\s*\(\s*[●○x ]?\s*\)|^\s*\[\s*[xX ]?\s*\]|Use arrow|Select.*:|Choose.*:|press enter/im,
    // Ink/React spinners (braille characters) and tool execution icon
    SPINNER: /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⏺]/,
    // Claude Code startup indicator
    CLAUDE_STARTUP: /Claude Code|claude-code|╭─|Tips:/i,
  }

  private readonly IDLE_TIMEOUT_MS = 800
  private readonly BUFFER_MAX_LENGTH = 1200
  private readonly HOOKS_PRIORITY_WINDOW_MS = 5000 // Hooks take priority for 5 seconds after last update

  initSession(sessionId: string, cwd: string = ''): void {
    this.sessions.set(sessionId, {
      state: 'idle',
      isClaudeActive: false,
      lastActivityTime: Date.now(),
      promptBuffer: '',
      timeoutId: null,
      detectionSource: 'initial',
      cwd,
      lastHooksUpdate: 0,
      pendingClaudeExit: false,
    })
  }

  // Called when Ctrl+C is detected - marks session as pending exit
  notifyCtrlC(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session && session.isClaudeActive) {
      console.log(`[ClaudeState:${sessionId.slice(0,8)}] CTRL+C detected, waiting for shell prompt`)
      session.pendingClaudeExit = true
      // Clear the prompt buffer to make shell prompt detection easier
      session.promptBuffer = ''
      // Set a timeout to force exit if shell prompt isn't detected
      if (session.timeoutId) {
        clearTimeout(session.timeoutId)
      }
      session.timeoutId = setTimeout(() => {
        const currentSession = this.sessions.get(sessionId)
        if (currentSession && currentSession.pendingClaudeExit) {
          console.log(`[ClaudeState:${sessionId.slice(0,8)}] Timeout waiting for shell prompt, forcing Claude exit`)
          currentSession.pendingClaudeExit = false
          currentSession.promptBuffer = ''
          // Don't set isClaudeActive directly - let updateState handle it so callback fires
          this.updateState(sessionId, 'idle', false, 'pattern')
        }
      }, 2000) // 2 second timeout
    }
  }

  // Update session cwd (called when cwd changes)
  updateSessionCwd(sessionId: string, cwd: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.cwd = cwd
    }
  }

  // Update state from Hooks API (highest priority)
  updateFromHooks(cwd: string, state: ClaudeState, isClaudeActive: boolean = true): void {
    // Find session by cwd
    const sessionId = this.findSessionByCwd(cwd)
    if (!sessionId) {
      console.log(`[ClaudeState] No session found for cwd: ${cwd}`)
      const sessions = Array.from(this.sessions.entries()).map(([id, s]) => `${id.slice(0,8)}=${s.cwd || '(empty)'}`).join(', ')
      console.log(`[ClaudeState] Available sessions: ${sessions || '(none)'}`)
      return
    }

    const session = this.sessions.get(sessionId)
    if (!session) return

    console.log(`[ClaudeState:${sessionId.slice(0,8)}] HOOKS UPDATE: ${session.state} -> ${state} (cwd: ${session.cwd})`)
    session.lastHooksUpdate = Date.now()
    session.detectionSource = 'hooks'

    // Hooks event means Claude is definitely active
    if (!session.isClaudeActive) {
      session.isClaudeActive = true
    }

    // Clear any pending timeout since we have fresh hooks data
    if (session.timeoutId) {
      clearTimeout(session.timeoutId)
      session.timeoutId = null
    }

    this.updateState(sessionId, state, isClaudeActive, 'hooks')
  }

  // Find session by cwd (for matching hooks events)
  private findSessionByCwd(cwd: string): string | null {
    // Normalize target cwd
    const targetCwd = cwd.replace(/\/$/, '')

    // First try exact match with active Claude sessions
    for (const [sessionId, session] of this.sessions) {
      const sessionCwd = session.cwd.replace(/\/$/, '')
      if (sessionCwd === targetCwd && session.isClaudeActive) {
        return sessionId
      }
    }

    // Second try exact match with any session (cwd matches)
    for (const [sessionId, session] of this.sessions) {
      const sessionCwd = session.cwd.replace(/\/$/, '')
      if (sessionCwd === targetCwd) {
        console.log(`[ClaudeState] Exact cwd match (inactive): ${sessionId.slice(0,8)}`)
        return sessionId
      }
    }

    // Then try matching sessions that are subpaths or superpaths
    for (const [sessionId, session] of this.sessions) {
      const sessionCwd = session.cwd.replace(/\/$/, '')
      if (sessionCwd && (targetCwd.startsWith(sessionCwd) || sessionCwd.startsWith(targetCwd))) {
        console.log(`[ClaudeState] Partial cwd match: session=${sessionCwd}, hooks=${targetCwd}`)
        return sessionId
      }
    }

    // Last resort: find any session that has Claude active
    for (const [sessionId, session] of this.sessions) {
      if (session.isClaudeActive) {
        console.log(`[ClaudeState] Fallback to active Claude session: ${sessionId.slice(0,8)}`)
        return sessionId
      }
    }

    // Very last resort: find session that was recently active (within 30 seconds)
    const now = Date.now()
    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivityTime < 30000) {
        console.log(`[ClaudeState] Fallback to recently active session: ${sessionId.slice(0,8)}`)
        return sessionId
      }
    }

    return null
  }

  // Check if hooks should take priority over pattern matching
  private isHooksPriority(session: SessionState): boolean {
    const elapsed = Date.now() - session.lastHooksUpdate
    return elapsed < this.HOOKS_PRIORITY_WINDOW_MS && session.detectionSource === 'hooks'
  }

  destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session?.timeoutId) {
      clearTimeout(session.timeoutId)
    }
    this.sessions.delete(sessionId)
    this.stateChangeCallbacks.delete(sessionId)
  }

  setStateChangeCallback(sessionId: string, callback: StateChangeCallback): void {
    this.stateChangeCallbacks.set(sessionId, callback)
  }

  // Strip ANSI escape codes for pattern matching
  private stripAnsi(text: string): string {
    return text
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // CSI sequences
      .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '') // OSC sequences
      .replace(/\x1b[()][AB012]/g, '') // Character set
      .replace(/\x1b[=>]/g, '') // Keypad mode
  }

  processData(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.lastActivityTime = Date.now()

    // If pending Claude exit (Ctrl+C was pressed), prioritize shell prompt detection
    if (session.pendingClaudeExit) {
      session.promptBuffer += data
      const strippedBuffer = this.stripAnsi(session.promptBuffer)

      // Check for shell prompt - more lenient matching after Ctrl+C
      // Look for > or $ at the end, possibly after ^C or newlines
      if (this.CLAUDE_PATTERNS.SHELL_PROMPT.test(strippedBuffer) ||
          /[>$]\s*$/.test(strippedBuffer)) {
        console.log(`[ClaudeState:${sessionId.slice(0,8)}] Shell prompt detected after Ctrl+C, marking Claude as inactive`)
        session.pendingClaudeExit = false
        session.promptBuffer = ''
        if (session.timeoutId) {
          clearTimeout(session.timeoutId)
          session.timeoutId = null
        }
        // Don't set isClaudeActive directly - let updateState handle it so callback fires
        this.updateState(sessionId, 'idle', false, 'pattern')
        return
      }
      return
    }

    // If hooks recently updated state, skip pattern matching (hooks have priority)
    if (this.isHooksPriority(session)) {
      // Only process Claude activation/deactivation detection
      const strippedBuffer = this.stripAnsi(session.promptBuffer + data)

      // Still detect Claude exit even with hooks priority
      if (session.isClaudeActive) {
        if (this.CLAUDE_PATTERNS.SHELL_PROMPT.test(strippedBuffer) &&
            !this.CLAUDE_PATTERNS.CLAUDE_PROMPT.test(strippedBuffer)) {
          session.isClaudeActive = false
          session.promptBuffer = ''
          this.updateState(sessionId, 'idle', false, 'pattern')
          return
        }
      }
      return
    }

    // Append to buffer (keep last N characters)
    session.promptBuffer += data
    if (session.promptBuffer.length > this.BUFFER_MAX_LENGTH) {
      session.promptBuffer = session.promptBuffer.slice(-this.BUFFER_MAX_LENGTH)
    }

    const strippedBuffer = this.stripAnsi(session.promptBuffer)
    const strippedData = this.stripAnsi(data)

    // Debug logging (reduced verbosity)
    if (strippedData.trim().length > 0) {
      console.log(`[ClaudeState:${sessionId.slice(0,8)}] data.length=${data.length}, state=${session.state}, source=${session.detectionSource}`)
    }

    // Detect Claude Code activation
    if (!session.isClaudeActive) {
      // Claude startup patterns
      if (this.CLAUDE_PATTERNS.CLAUDE_STARTUP.test(strippedData) ||
          this.CLAUDE_PATTERNS.SPINNER.test(data) ||
          this.CLAUDE_PATTERNS.CLAUDE_PROMPT.test(strippedBuffer)) {
        console.log(`[ClaudeState:${sessionId.slice(0,8)}] TRIGGER: Claude startup`)
        session.isClaudeActive = true
        this.updateState(sessionId, 'processing', true)
        return
      }
    }

    // Detect Claude Code deactivation (return to shell prompt)
    if (session.isClaudeActive) {
      // Shell prompt without Claude prompt = Claude exited
      if (this.CLAUDE_PATTERNS.SHELL_PROMPT.test(strippedBuffer) &&
          !this.CLAUDE_PATTERNS.CLAUDE_PROMPT.test(strippedBuffer)) {
        session.isClaudeActive = false
        session.promptBuffer = ''
        this.updateState(sessionId, 'idle', false)
        return
      }
    }

    // Only process states if Claude is active
    if (!session.isClaudeActive) {
      return
    }

    // Priority 1: Input waiting patterns (highest priority - don't let OSC override)
    // Check for selection UI (Ink selection component) - most specific pattern
    if (this.CLAUDE_PATTERNS.SELECTION_UI.test(strippedBuffer)) {
      this.updateState(sessionId, 'waiting-input', true)
      return
    }

    // Check for input waiting patterns (includes AskUserQuestion)
    if (this.CLAUDE_PATTERNS.INPUT_WAITING.test(strippedBuffer)) {
      this.updateState(sessionId, 'waiting-input', true)
      return
    }

    // Priority 2: OSC 633 sequences (VSCode Shell Integration)
    if (this.OSC_633.COMMAND_START.test(data)) {
      console.log(`[ClaudeState:${sessionId.slice(0,8)}] TRIGGER: OSC 633 COMMAND_START`)
      this.updateState(sessionId, 'processing', true)
      return
    }
    if (this.OSC_633.COMMAND_END.test(data)) {
      this.scheduleIdleCheck(sessionId)
      return
    }
    if (this.OSC_633.PROMPT_START.test(data) || this.OSC_633.PROMPT_END.test(data)) {
      // Only go idle if not waiting for input
      if (session.state !== 'waiting-input') {
        this.updateState(sessionId, 'idle', true)
      }
      return
    }

    // Priority 3: OSC 133 sequences
    if (this.OSC_133.COMMAND_START.test(data)) {
      console.log(`[ClaudeState:${sessionId.slice(0,8)}] TRIGGER: OSC 133 COMMAND_START`)
      this.updateState(sessionId, 'processing', true)
      return
    }
    if (this.OSC_133.COMMAND_END.test(data)) {
      this.scheduleIdleCheck(sessionId)
      return
    }

    // Priority 4: Synchronized output
    // Only use SYNC_OUTPUT to extend processing state, not to transition from idle
    // (screen redraws on resize send SYNC_OUTPUT but shouldn't change idle -> processing)
    if (this.SYNC_OUTPUT.START.test(data)) {
      if (session.state === 'processing') {
        console.log(`[ClaudeState:${sessionId.slice(0,8)}] TRIGGER: SYNC_OUTPUT START (extending processing)`)
        // Already processing, just continue
      }
      return
    }
    if (this.SYNC_OUTPUT.END.test(data)) {
      if (session.state === 'processing') {
        this.scheduleIdleCheck(sessionId)
      }
      return
    }

    // Priority 5: Other pattern matching

    // Check for Claude prompt (idle)
    if (this.CLAUDE_PATTERNS.CLAUDE_PROMPT.test(strippedBuffer)) {
      // Only go idle if not waiting for input
      if (session.state !== 'waiting-input') {
        this.updateState(sessionId, 'idle', true)
        session.promptBuffer = ''
      }
      return
    }

    // Check for spinner (processing)
    if (this.CLAUDE_PATTERNS.SPINNER.test(data)) {
      console.log(`[ClaudeState:${sessionId.slice(0,8)}] TRIGGER: SPINNER`)
      this.updateState(sessionId, 'processing', true)
      return
    }

    // If already processing and there's visible output, extend the processing state
    // Don't use this fallback to transition from idle -> processing (only explicit signals should do that)
    const trimmedData = strippedData.trim()
    const isOnlyShellPrompt = /^[>$]\s*$/.test(trimmedData)
    if (session.state === 'processing' && trimmedData.length > 0 && !isOnlyShellPrompt) {
      // Already processing, just extend the idle check timeout
      this.scheduleIdleCheck(sessionId)
    }
  }

  private updateState(sessionId: string, newState: ClaudeState, isClaudeActive: boolean, source: DetectionSource = 'pattern'): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const stateChanged = session.state !== newState || session.isClaudeActive !== isClaudeActive
    if (!stateChanged) return

    console.log(`[ClaudeState:${sessionId.slice(0,8)}] STATE CHANGE: ${session.state} -> ${newState} (source: ${source})`)

    session.state = newState
    session.isClaudeActive = isClaudeActive
    session.detectionSource = source

    const callback = this.stateChangeCallbacks.get(sessionId)
    if (callback) {
      callback({ state: newState, isClaudeActive, detectionSource: source })
    }
  }

  private scheduleIdleCheck(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    // Don't schedule idle check if already waiting for input
    if (session.state === 'waiting-input') return

    if (session.timeoutId) {
      clearTimeout(session.timeoutId)
    }

    session.timeoutId = setTimeout(() => {
      const currentSession = this.sessions.get(sessionId)
      if (!currentSession || !currentSession.isClaudeActive) return

      // Don't change to idle if waiting for input
      if (currentSession.state === 'waiting-input') return

      const elapsed = Date.now() - currentSession.lastActivityTime
      if (elapsed >= this.IDLE_TIMEOUT_MS && currentSession.state === 'processing') {
        this.updateState(sessionId, 'idle', true)
        currentSession.promptBuffer = ''
      }
    }, this.IDLE_TIMEOUT_MS)
  }

  getState(sessionId: string): ClaudeStateInfo {
    const session = this.sessions.get(sessionId)
    return {
      state: session?.state ?? 'idle',
      isClaudeActive: session?.isClaudeActive ?? false,
      detectionSource: session?.detectionSource ?? 'initial',
    }
  }

  // Get all session cwds for debugging
  getAllSessionCwds(): Map<string, string> {
    const result = new Map<string, string>()
    for (const [sessionId, session] of this.sessions) {
      result.set(sessionId, session.cwd)
    }
    return result
  }
}

export const claudeStateDetector = new ClaudeStateDetector()
