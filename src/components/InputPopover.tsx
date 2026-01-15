import { useEffect, useCallback, useRef } from 'react'
import { useInputPopoverStore } from '../stores/inputPopoverStore'
import { useCommandStore } from '../stores/commandStore'
import { useScriptsStore } from '../stores/scriptsStore'
import { useSessionStore } from '../stores/sessionStore'

interface InputPopoverProps {
  projectPath: string | null
}

const SERVER_SCRIPTS = ['dev', 'start', 'serve', 'preview', 'watch']

function isServerScript(name: string): boolean {
  return SERVER_SCRIPTS.some((s) => name.toLowerCase().includes(s))
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  if (hours < 24) return `${hours}時間前`
  return `${days}日前`
}

export function InputPopover({ projectPath }: InputPopoverProps) {
  const {
    isOpen,
    activeTab,
    selectedIndex,
    cursorPosition,
    setActiveTab,
    setSelectedIndex,
    close,
  } = useInputPopoverStore()

  const { entries, favorites, sortMode, loadCommands, addCommand } = useCommandStore()
  const { scripts, packageManager, loadScripts } = useScriptsStore()
  const { activeSessionId } = useSessionStore()
  const popoverRef = useRef<HTMLDivElement>(null)

  // Load data when opened
  useEffect(() => {
    if (isOpen) {
      loadCommands()
      if (projectPath) {
        loadScripts(projectPath)
      }
    }
  }, [isOpen, projectPath, loadCommands, loadScripts])

  // Get history items
  const projectCommands = projectPath
    ? entries.filter((e) => e.projectPath === projectPath)
    : []

  const sortedCommands = [...projectCommands].sort((a, b) => {
    if (sortMode === 'frequency') return b.count - a.count
    return b.lastUsed - a.lastUsed
  })

  const historyItems = [
    ...favorites.filter((e) => e.projectPath === projectPath),
    ...sortedCommands.filter((e) => !e.isFavorite).slice(0, 15),
  ]

  // Get scripts items
  const scriptEntries = Object.entries(scripts)

  // Current items based on active tab
  const currentItems = activeTab === 'history' ? historyItems : scriptEntries
  const maxIndex = currentItems.length - 1

  const runHistoryCommand = useCallback(
    async (command: string) => {
      if (!activeSessionId) return
      window.electronAPI.writeSession(activeSessionId, command + '\n')
      if (projectPath) {
        await addCommand(command, projectPath)
      }
      close()
    },
    [activeSessionId, projectPath, addCommand, close]
  )

  const runScript = useCallback(
    async (scriptName: string) => {
      if (!activeSessionId) return
      await window.electronAPI.runScript(activeSessionId, scriptName, packageManager)
      close()
    },
    [activeSessionId, packageManager, close]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault()
          e.stopPropagation()
          setActiveTab(activeTab === 'history' ? 'scripts' : 'history')
          break
        case 'ArrowUp':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex(Math.max(selectedIndex - 1, 0))
          break
        case 'ArrowDown':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex(Math.min(selectedIndex + 1, maxIndex))
          break
        case 'Enter':
          e.preventDefault()
          e.stopPropagation()
          if (activeTab === 'history' && historyItems[selectedIndex]) {
            runHistoryCommand(historyItems[selectedIndex].command)
          } else if (activeTab === 'scripts' && scriptEntries[selectedIndex]) {
            runScript(scriptEntries[selectedIndex][0])
          }
          break
        case 'Escape':
          e.preventDefault()
          e.stopPropagation()
          close()
          break
      }
    },
    [
      isOpen,
      activeTab,
      selectedIndex,
      maxIndex,
      historyItems,
      scriptEntries,
      setActiveTab,
      setSelectedIndex,
      runHistoryCommand,
      runScript,
      close,
    ]
  )

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown, true)
      return () => window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen, handleKeyDown])

  // Scroll selected item into view
  useEffect(() => {
    if (isOpen && popoverRef.current) {
      const selectedEl = popoverRef.current.querySelector('.input-popover-item.selected')
      selectedEl?.scrollIntoView({ block: 'nearest' })
    }
  }, [isOpen, selectedIndex])

  if (!isOpen) return null

  const POPOVER_HEIGHT = 280
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const showAbove = cursorPosition ? cursorPosition.y > POPOVER_HEIGHT + 20 : true

  const popoverStyle: React.CSSProperties = cursorPosition
    ? {
        position: 'fixed',
        left: cursorPosition.x,
        bottom: showAbove ? viewportHeight - cursorPosition.y + 8 : undefined,
        top: showAbove ? undefined : cursorPosition.y + 20,
        maxWidth: '400px',
      }
    : {}

  return (
    <div className="input-popover" ref={popoverRef} style={popoverStyle}>
      <div className="input-popover-tabs">
        <button
          className={`input-popover-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          履歴
        </button>
        <button
          className={`input-popover-tab ${activeTab === 'scripts' ? 'active' : ''}`}
          onClick={() => setActiveTab('scripts')}
        >
          Scripts
        </button>
      </div>

      <div className="input-popover-content">
        {activeTab === 'history' ? (
          historyItems.length === 0 ? (
            <div className="input-popover-empty">履歴がありません</div>
          ) : (
            historyItems.map((entry, index) => (
              <div
                key={`${entry.command}-${index}`}
                className={`input-popover-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => runHistoryCommand(entry.command)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {entry.isFavorite && <span className="popover-favorite">★</span>}
                <span className="popover-command">{entry.command}</span>
                <span className="popover-meta">
                  {sortMode === 'frequency'
                    ? `${entry.count}回`
                    : formatTimeAgo(entry.lastUsed)}
                </span>
              </div>
            ))
          )
        ) : scriptEntries.length === 0 ? (
          <div className="input-popover-empty">scriptsがありません</div>
        ) : (
          scriptEntries.map(([name, cmd], index) => (
            <div
              key={name}
              className={`input-popover-item ${index === selectedIndex ? 'selected' : ''} ${isServerScript(name) ? 'server-script' : ''}`}
              onClick={() => runScript(name)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {isServerScript(name) && <span className="popover-server">●</span>}
              <span className="popover-script-name">{name}</span>
              <span className="popover-script-cmd">{cmd}</span>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
