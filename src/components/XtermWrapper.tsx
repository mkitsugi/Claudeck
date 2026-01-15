import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { InputPopover } from './InputPopover'
import { useInputPopoverStore } from '../stores/inputPopoverStore'
import { useThemeStore } from '../stores/themeStore'
import { useClaudeStatusStore } from '../stores/claudeStatusStore'
import { ClaudeCodeDetector } from '../utils/claudeCodeDetector'
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
  const detectorRef = useRef<ClaudeCodeDetector | null>(null)
  const initializedRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const { currentTheme } = useThemeStore()
  const setStatus = useClaudeStatusStore((state) => state.setStatus)

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

      // Claude Code状態検知器を初期化
      const detector = new ClaudeCodeDetector()
      detectorRef.current = detector
      detector.onStateChange((state) => {
        setStatus(sessionId, state.status)
      })

      // Intercept special keys - don't let xterm handle them
      terminal.attachCustomKeyEventHandler((event) => {
        // Block Tab for pane cycling, but allow Shift+Tab for Claude Code
        if (event.key === 'Tab' && !event.shiftKey) {
          return false // Don't process Tab in terminal
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
        window.electronAPI.writeSession(sessionId, data)
      })

      // Handle output - subscribe to data for this session
      const unsubscribeData = window.electronAPI.onSessionData((sid: string, data: string) => {
        if (sid === sessionId && terminalRef.current) {
          terminalRef.current.write(data)
          // 検知器にデータを渡す
          detectorRef.current?.onData(data)
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
        detectorRef.current?.dispose()
        detectorRef.current = null
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
      <ClaudeButton onClick={handleClaudeClick} />
      {isActive && <InputPopover projectPath={projectPath} />}
    </div>
  )
}
