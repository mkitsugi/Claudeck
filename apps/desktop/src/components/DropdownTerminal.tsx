import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

export function DropdownTerminal() {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const initializedRef = useRef(false)
  const [cwd, setCwd] = useState('')

  // Apply style to CSS variables
  const applyStyle = (opts: { opacity: number; blur: number }) => {
    console.log('[DropdownTerminal] Applying style:', opts)
    document.documentElement.style.setProperty('--dropdown-opacity', String(opts.opacity / 100))
    document.documentElement.style.setProperty('--dropdown-blur', `${opts.blur}px`)
  }

  // Load initial settings and listen for updates
  useEffect(() => {
    console.log('[DropdownTerminal] useEffect for style listener mounting...')

    // Load current settings on mount
    window.electronAPI.loadSettings().then((settings) => {
      console.log('[DropdownTerminal] Settings loaded:', settings)
      if (settings.dropdown) {
        console.log('[DropdownTerminal] Initial dropdown settings:', settings.dropdown)
        applyStyle(settings.dropdown)
      }
    })

    // Listen for style updates from settings
    console.log('[DropdownTerminal] Registering onDropdownStyleUpdate listener...')
    const unsubscribe = window.electronAPI.onDropdownStyleUpdate((opts) => {
      console.log('[DropdownTerminal] Style update received:', opts)
      applyStyle(opts)
    })
    console.log('[DropdownTerminal] Listener registered')
    return () => {
      console.log('[DropdownTerminal] Unsubscribing listener')
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    console.log('DropdownTerminal useEffect', {
      container: containerRef.current,
      initialized: initializedRef.current,
      electronAPI: typeof window.electronAPI
    })
    if (!containerRef.current || initializedRef.current) return

    const initTerminal = async () => {
      console.log('initTerminal called', containerRef.current?.clientWidth, containerRef.current?.clientHeight)
      if (!containerRef.current || terminalRef.current) return

      try {
        console.log('Creating dropdown session...')
        await window.electronAPI.createDropdownSession('')
        console.log('Dropdown session created')

        const terminal = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#d4d4d4',
            cursorAccent: '#1e1e1e',
            selectionBackground: '#264f78',
            black: '#000000',
            red: '#cd3131',
            green: '#0dbc79',
            yellow: '#e5e510',
            blue: '#2472c8',
            magenta: '#bc3fbc',
            cyan: '#11a8cd',
            white: '#e5e5e5',
            brightBlack: '#666666',
            brightRed: '#f14c4c',
            brightGreen: '#23d18b',
            brightYellow: '#f5f543',
            brightBlue: '#3b8eea',
            brightMagenta: '#d670d6',
            brightCyan: '#29b8db',
            brightWhite: '#ffffff',
          },
        })

        const fitAddon = new FitAddon()
        terminal.loadAddon(fitAddon)
        terminal.open(containerRef.current!)

        terminalRef.current = terminal
        fitAddonRef.current = fitAddon
        initializedRef.current = true

        requestAnimationFrame(() => {
          fitAddon.fit()
          window.electronAPI.resizeDropdownSession(terminal.cols, terminal.rows)
        })

        terminal.onData((data) => {
          window.electronAPI.writeDropdownSession(data)
        })

        const unsubscribeData = window.electronAPI.onDropdownData((_sid: string, data: string) => {
          if (terminalRef.current) {
            terminalRef.current.write(data)
          }
        })

        const unsubscribeCwd = window.electronAPI.onDropdownCwd((_sid: string, newCwd: string) => {
          setCwd(newCwd)
        })

        const handleResize = () => {
          if (fitAddonRef.current && terminalRef.current) {
            fitAddonRef.current.fit()
            window.electronAPI.resizeDropdownSession(
              terminalRef.current.cols,
              terminalRef.current.rows
            )
          }
        }
        window.addEventListener('resize', handleResize)

        const resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(handleResize)
        })
        resizeObserver.observe(containerRef.current!)

        terminal.focus()
        console.log('Terminal initialized successfully')

        // Store cleanup functions for later
        ;(window as unknown as { __dropdownCleanup?: () => void }).__dropdownCleanup = () => {
          window.removeEventListener('resize', handleResize)
          resizeObserver.disconnect()
          unsubscribeData()
          unsubscribeCwd()
        }
      } catch (error) {
        console.error('Error initializing dropdown terminal:', error)
      }
    }

    const container = containerRef.current
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      console.log('Container size is 0, waiting for resize...')
      const observer = new ResizeObserver(() => {
        console.log('ResizeObserver triggered', container.clientWidth, container.clientHeight)
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          observer.disconnect()
          initTerminal()
        }
      })
      observer.observe(container)
      return () => observer.disconnect()
    }

    initTerminal()

    return () => {
      const cleanup = (window as unknown as { __dropdownCleanup?: () => void }).__dropdownCleanup
      if (cleanup) cleanup()
      if (terminalRef.current) {
        terminalRef.current.dispose()
        terminalRef.current = null
        initializedRef.current = false
      }
    }
  }, [])

  return (
    <div className="dropdown-terminal">
      <div className="dropdown-header">
        <span className="dropdown-cwd">{cwd || '~'}</span>
        <span className="dropdown-hint">Cmd+. to hide</span>
      </div>
      <div ref={containerRef} className="dropdown-terminal-content" />
      <div className="dropdown-handle" />
    </div>
  )
}
