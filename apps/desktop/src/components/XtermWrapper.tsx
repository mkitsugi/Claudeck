import { useEffect, useRef, useCallback, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { InputPopover } from './InputPopover'
import { useInputPopoverStore } from '../stores/inputPopoverStore'
import { useThemeStore } from '../stores/themeStore'
import { useGhostCompletionStore } from '../stores/ghostCompletionStore'
import { useCommandStore } from '../stores/commandStore'
interface XtermWrapperProps {
  sessionId: string
  isActive: boolean
  projectPath: string
  onActivate?: () => void
}

export function XtermWrapper({ sessionId, isActive, projectPath, onActivate }: XtermWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const initializedRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const isActiveRef = useRef(isActive)  // 最新のisActive値を保持するref
  const { currentTheme, resolvedMode } = useThemeStore()
  const cwdRef = useRef<string>(projectPath)
  const { isActive: ghostActive, ghostText } = useGhostCompletionStore()
  const [ghostPosition, setGhostPosition] = useState({ x: 0, y: 0 })

  // isActiveの最新値をrefに同期
  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  // テーマからxtermのテーマオブジェクトを生成
  const getXtermTheme = useCallback(() => {
    const colors = currentTheme[resolvedMode]
    return {
      background: colors['terminal-bg'],
      foreground: colors['terminal-fg'],
      cursor: colors['terminal-cursor'],
      cursorAccent: colors['terminal-bg'],
      selectionBackground: colors['terminal-selection'],
      black: colors['terminal-black'],
      red: colors['terminal-red'],
      green: colors['terminal-green'],
      yellow: colors['terminal-yellow'],
      blue: colors['terminal-blue'],
      magenta: colors['terminal-magenta'],
      cyan: colors['terminal-cyan'],
      white: colors['terminal-white'],
      brightBlack: colors['terminal-bright-black'],
      brightRed: colors['terminal-bright-red'],
      brightGreen: colors['terminal-bright-green'],
      brightYellow: colors['terminal-bright-yellow'],
      brightBlue: colors['terminal-bright-blue'],
      brightMagenta: colors['terminal-bright-magenta'],
      brightCyan: colors['terminal-bright-cyan'],
      brightWhite: colors['terminal-bright-white'],
    }
  }, [currentTheme, resolvedMode])

  // テーマ変更時に既存ターミナルのテーマを更新
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = getXtermTheme()
    }
  }, [currentTheme, getXtermTheme])

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return

    const initTerminal = () => {
      if (!containerRef.current || terminalRef.current) return

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: getXtermTheme(),
      })

      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.open(containerRef.current!)

      terminalRef.current = terminal
      fitAddonRef.current = fitAddon
      initializedRef.current = true

      // Intercept special keys - don't let xterm handle them
      terminal.attachCustomKeyEventHandler((event) => {
        // Tab key handling - completion when input exists, pane cycling otherwise
        if (event.key === 'Tab' && !event.shiftKey && event.type === 'keydown') {
          const ghostStore = useGhostCompletionStore.getState()

          // If ghost is active, accept completion
          if (ghostStore.isActive) {
            window.electronAPI.writeSession(sessionId, ghostStore.ghostText)
            ghostStore.accept() // Use accept() to set justAccepted flag
            return false
          }

          // Check if there's input - get current line
          const buffer = terminal.buffer.active
          const cursorY = buffer.cursorY + buffer.viewportY
          const line = buffer.getLine(cursorY)
          if (line) {
            const lineText = line.translateToString(true)
            // More flexible prompt detection: match common prompts ($, >, %, #, ❯) and get text after
            const promptMatch = lineText.match(/(?:^|\s)[$>%#❯]\s*(.+)$/)
            const currentInput = promptMatch ? promptMatch[1].trim() : ''

            console.log('[Tab Completion] lineText:', JSON.stringify(lineText))
            console.log('[Tab Completion] currentInput:', currentInput)

            if (currentInput) {
              // Has input - trigger completion
              window.electronAPI.getCompletion({
                input: currentInput,
                cwd: cwdRef.current,
                projectPath,
              }).then((result) => {
                console.log('[Tab Completion] result:', result)
                if (result.completion) {
                  const screenEl = containerRef.current?.querySelector('.xterm-screen')
                  const wrapperEl = containerRef.current?.parentElement // xterm-wrapper
                  if (screenEl && wrapperEl) {
                    const screenRect = screenEl.getBoundingClientRect()
                    const wrapperRect = wrapperEl.getBoundingClientRect()
                    const cellWidth = screenRect.width / terminal.cols
                    const cellHeight = screenRect.height / terminal.rows
                    // Calculate position relative to xterm-wrapper
                    const pos = {
                      x: (screenRect.left - wrapperRect.left) + (buffer.cursorX * cellWidth),
                      y: (screenRect.top - wrapperRect.top) + (buffer.cursorY * cellHeight),
                    }
                    console.log('[Tab Completion] ghost position:', pos)
                    useGhostCompletionStore.getState().setGhost(result.completion, result.type, pos.x, pos.y)
                    setGhostPosition(pos)
                  }
                }
              })
              return false
            }
          }
          // No input - let parent handle pane cycling
          return false
        }

        // ArrowRight accepts ghost completion
        if (event.key === 'ArrowRight' && event.type === 'keydown') {
          const ghostStore = useGhostCompletionStore.getState()
          if (ghostStore.isActive) {
            window.electronAPI.writeSession(sessionId, ghostStore.ghostText)
            ghostStore.accept()
            return false
          }
        }

        // Escape clears ghost
        if (event.key === 'Escape' && event.type === 'keydown') {
          const ghostStore = useGhostCompletionStore.getState()
          if (ghostStore.isActive) {
            ghostStore.clear()
            return false
          }
        }
        // Open popover on ArrowDown when active pane (only on keydown to avoid double trigger)
        if (event.key === 'ArrowDown' && event.type === 'keydown' && !useInputPopoverStore.getState().isOpen) {
          // Check if we're at a prompt (look for prompt characters in current line)
          const buffer = terminal.buffer.active
          const cursorY = buffer.cursorY + buffer.viewportY
          const line = buffer.getLine(cursorY)
          if (line) {
            const lineText = line.translateToString(true)
            // Check for common prompt characters: $, >, %, #, ❯
            const hasPrompt = /[$>%#❯]\s*$/.test(lineText.trimEnd()) || /[$>%#❯]\s/.test(lineText)
            if (!hasPrompt) {
              return true // Let terminal handle it normally
            }
          }

          // Get cursor position from xterm screen element
          const screenEl = containerRef.current?.querySelector('.xterm-screen')
          if (screenEl) {
            const screenRect = screenEl.getBoundingClientRect()
            // Get cell dimensions from screen element
            const cellWidth = screenRect.width / terminal.cols
            const cellHeight = screenRect.height / terminal.rows

            // Calculate cursor position in viewport
            const cursorX = screenRect.left + (buffer.cursorX * cellWidth)
            const cursorY = screenRect.top + (buffer.cursorY * cellHeight)

            useInputPopoverStore.getState().openAtCursor({
              x: cursorX,
              y: cursorY,
            })
          } else {
            useInputPopoverStore.getState().setOpen(true)
          }
          return false // Don't send to terminal
        }
        // When popover is open, block arrow keys and Enter/Escape from terminal
        if (useInputPopoverStore.getState().isOpen) {
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(event.key)) {
            return false
          }
        }

        // Save command to history when Enter is pressed
        if (event.key === 'Enter' && event.type === 'keydown') {
          const buffer = terminal.buffer.active
          const cursorY = buffer.cursorY + buffer.viewportY
          const line = buffer.getLine(cursorY)
          if (line) {
            const lineText = line.translateToString(true)
            // Extract command after prompt (> or other common prompts)
            const promptMatch = lineText.match(/^(?:.*[$>%#❯])\s*(.+)$/)
            if (promptMatch && promptMatch[1]) {
              const command = promptMatch[1].trim()
              if (command) {
                useCommandStore.getState().addCommand(command, projectPath)
              }
            }
          }
        }

        return true
      })

      // Delay fit to ensure container is properly sized
      requestAnimationFrame(() => {
        fitAddon.fit()
        window.electronAPI.resizeSession(sessionId, terminal.cols, terminal.rows)
        // 初期化時にisActiveならフォーカスを当てる（プロジェクト切替時対応）
        if (isActiveRef.current) {
          terminal.scrollToBottom()
          terminal.focus()
        }
      })

      // Handle input
      terminal.onData((data) => {
        // Clear ghost when user types
        useGhostCompletionStore.getState().clear()
        window.electronAPI.writeSession(sessionId, data)

        // Auto-trigger completion after typing (with small delay)
        // Skip for control characters (Enter, Backspace, etc)
        if (data.length === 1 && data.charCodeAt(0) >= 32) {
          setTimeout(() => {
            const buffer = terminal.buffer.active
            const cursorY = buffer.cursorY + buffer.viewportY
            const line = buffer.getLine(cursorY)
            if (line) {
              const lineText = line.translateToString(true)
              const promptMatch = lineText.match(/(?:^|\s)[$>%#❯]\s*(.+)$/)
              const currentInput = promptMatch ? promptMatch[1].trim() : ''

              if (currentInput && currentInput.length >= 2) {
                window.electronAPI.getCompletion({
                  input: currentInput,
                  cwd: cwdRef.current,
                  projectPath,
                }).then((result) => {
                  if (result.completion) {
                    const screenEl = containerRef.current?.querySelector('.xterm-screen')
                    const wrapperEl = containerRef.current?.parentElement
                    if (screenEl && wrapperEl) {
                      const screenRect = screenEl.getBoundingClientRect()
                      const wrapperRect = wrapperEl.getBoundingClientRect()
                      const cellWidth = screenRect.width / terminal.cols
                      const cellHeight = screenRect.height / terminal.rows
                      const pos = {
                        x: (screenRect.left - wrapperRect.left) + (buffer.cursorX * cellWidth),
                        y: (screenRect.top - wrapperRect.top) + (buffer.cursorY * cellHeight),
                      }
                      useGhostCompletionStore.getState().setGhost(result.completion, result.type, pos.x, pos.y)
                      setGhostPosition(pos)
                    }
                  }
                })
              }
            }
          }, 50) // Small delay to let terminal update
        }
      })

      // Handle output - subscribe to data for this session
      const unsubscribeData = window.electronAPI.onSessionData((sid: string, data: string) => {
        if (sid === sessionId && terminalRef.current) {
          terminalRef.current.write(data)
        }
      })

      // Track cwd changes
      const unsubscribeCwd = window.electronAPI.onSessionCwd((sid: string, cwd: string) => {
        if (sid === sessionId) {
          cwdRef.current = cwd
        }
      })

      // Handle resize
      const handleResize = () => {
        if (fitAddonRef.current && terminalRef.current) {
          fitAddonRef.current.fit()
          window.electronAPI.resizeSession(sessionId, terminalRef.current.cols, terminalRef.current.rows)
        }
      }
      window.addEventListener('resize', handleResize)

      // Observe container size changes (for grid layout changes)
      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(handleResize)
      })
      resizeObserver.observe(containerRef.current!)

      // Store cleanup function
      cleanupRef.current = () => {
        window.removeEventListener('resize', handleResize)
        resizeObserver.disconnect()
        unsubscribeData()
        unsubscribeCwd()
      }
    }

    // Wait for container to be sized
    const container = containerRef.current
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      const observer = new ResizeObserver(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          observer.disconnect()
          initTerminal()
        }
      })
      observer.observe(container)
      return () => {
        observer.disconnect()
        cleanupRef.current?.()
        cleanupRef.current = null
        if (terminalRef.current) {
          terminalRef.current.dispose()
          terminalRef.current = null
          initializedRef.current = false
        }
      }
    }

    initTerminal()

    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
      if (terminalRef.current) {
        terminalRef.current.dispose()
        terminalRef.current = null
        initializedRef.current = false
      }
    }
  }, [sessionId])

  useEffect(() => {
    if (isActive && fitAddonRef.current && terminalRef.current) {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit()
        terminalRef.current?.scrollToBottom()
        terminalRef.current?.focus()
      })
    } else {
      // Close popover when pane loses focus
      useInputPopoverStore.getState().close()
    }
  }, [isActive])

  return (
    <div className="xterm-wrapper" onMouseDownCapture={onActivate}>
      <div
        ref={containerRef}
        className="xterm-container"
      />
      {/* Ghost completion overlay */}
      {ghostActive && (
        <div
          className="ghost-completion-overlay"
          style={{
            left: ghostPosition.x,
            top: ghostPosition.y,
          }}
        >
          {ghostText}
        </div>
      )}
      {isActive && <InputPopover projectPath={projectPath} />}
    </div>
  )
}
