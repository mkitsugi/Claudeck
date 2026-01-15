import { useEffect, useRef, useCallback, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { InputPopover } from './InputPopover'
import { useInputPopoverStore } from '../stores/inputPopoverStore'
import { useThemeStore } from '../stores/themeStore'
import { useGhostCompletionStore } from '../stores/ghostCompletionStore'
import claudeColorSvg from '/claude-color.svg'

interface XtermWrapperProps {
  sessionId: string
  isActive: boolean
  projectPath: string
}

function ClaudeButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="claude-button-container">
      <button
        className="claude-button"
        onClick={onClick}
        title="claude コマンドを実行"
      >
        <img src={claudeColorSvg} alt="Claude" width={18} height={18} />
      </button>
    </div>
  )
}

export function XtermWrapper({ sessionId, isActive, projectPath }: XtermWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const initializedRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const { currentTheme } = useThemeStore()
  const cwdRef = useRef<string>(projectPath)
  const { isActive: ghostActive, ghostText } = useGhostCompletionStore()
  const [ghostPosition, setGhostPosition] = useState({ x: 0, y: 0 })

  // テーマからxtermのテーマオブジェクトを生成
  const getXtermTheme = useCallback(() => ({
    background: currentTheme.colors['terminal-bg'],
    foreground: currentTheme.colors['terminal-fg'],
    cursor: currentTheme.colors['terminal-cursor'],
    cursorAccent: currentTheme.colors['terminal-bg'],
    selectionBackground: currentTheme.colors['terminal-selection'],
    black: currentTheme.colors['terminal-black'],
    red: currentTheme.colors['terminal-red'],
    green: currentTheme.colors['terminal-green'],
    yellow: currentTheme.colors['terminal-yellow'],
    blue: currentTheme.colors['terminal-blue'],
    magenta: currentTheme.colors['terminal-magenta'],
    cyan: currentTheme.colors['terminal-cyan'],
    white: currentTheme.colors['terminal-white'],
    brightBlack: currentTheme.colors['terminal-bright-black'],
    brightRed: currentTheme.colors['terminal-bright-red'],
    brightGreen: currentTheme.colors['terminal-bright-green'],
    brightYellow: currentTheme.colors['terminal-bright-yellow'],
    brightBlue: currentTheme.colors['terminal-bright-blue'],
    brightMagenta: currentTheme.colors['terminal-bright-magenta'],
    brightCyan: currentTheme.colors['terminal-bright-cyan'],
    brightWhite: currentTheme.colors['terminal-bright-white'],
  }), [currentTheme])

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
            ghostStore.clear()
            return false
          }

          // Check if there's input - get current line
          const buffer = terminal.buffer.active
          const cursorY = buffer.cursorY + buffer.viewportY
          const line = buffer.getLine(cursorY)
          if (line) {
            const lineText = line.translateToString(true)
            const promptMatch = lineText.match(/^>\s*(.*)$/)
            const currentInput = promptMatch ? promptMatch[1] : ''

            if (currentInput) {
              // Has input - trigger completion
              window.electronAPI.getCompletion({
                input: currentInput,
                cwd: cwdRef.current,
                projectPath,
              }).then((result) => {
                if (result.completion) {
                  const screenEl = containerRef.current?.querySelector('.xterm-screen')
                  if (screenEl) {
                    const screenRect = screenEl.getBoundingClientRect()
                    const cellWidth = screenRect.width / terminal.cols
                    const cellHeight = screenRect.height / terminal.rows
                    const pos = {
                      x: buffer.cursorX * cellWidth,
                      y: buffer.cursorY * cellHeight,
                    }
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
            ghostStore.clear()
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
        return true
      })

      // Delay fit to ensure container is properly sized
      requestAnimationFrame(() => {
        fitAddon.fit()
        window.electronAPI.resizeSession(sessionId, terminal.cols, terminal.rows)
      })

      // Handle input
      terminal.onData((data) => {
        // Clear ghost when user types
        useGhostCompletionStore.getState().clear()
        window.electronAPI.writeSession(sessionId, data)
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

  const handleClaudeClick = useCallback(() => {
    window.electronAPI.writeSession(sessionId, 'claude\n')
  }, [sessionId])

  return (
    <div className="xterm-wrapper">
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
      <ClaudeButton onClick={handleClaudeClick} />
      {isActive && <InputPopover projectPath={projectPath} />}
    </div>
  )
}
