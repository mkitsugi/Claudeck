import { useEffect, useState, useRef, useCallback } from 'react'
import { useScriptsStore } from '../stores/scriptsStore'
import { useSessionStore } from '../stores/sessionStore'

const SERVER_SCRIPTS = ['dev', 'start', 'serve', 'preview', 'watch']

function isServerScript(name: string): boolean {
  return SERVER_SCRIPTS.some(s => name.toLowerCase().includes(s))
}

interface CommandPaletteProps {
  projectPath: string | null
}

export function CommandPalette({ projectPath }: CommandPaletteProps) {
  const { scripts, packageManager, isLoading, isOpen, setOpen, loadScripts } = useScriptsStore()
  const { activeSessionId } = useSessionStore()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load scripts when project changes
  useEffect(() => {
    if (projectPath && isOpen) {
      loadScripts(projectPath)
    }
  }, [projectPath, isOpen, loadScripts])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setSearch('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Filter scripts by search
  const scriptEntries = Object.entries(scripts)
  const filteredScripts = scriptEntries.filter(([name, cmd]) =>
    name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.toLowerCase().includes(search.toLowerCase())
  )

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const runScript = useCallback(async (scriptName: string) => {
    if (!activeSessionId) return
    await window.electronAPI.runScript(activeSessionId, scriptName, packageManager)
    setOpen(false)
  }, [activeSessionId, packageManager, setOpen])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filteredScripts.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredScripts[selectedIndex]) {
          runScript(filteredScripts[selectedIndex][0])
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }, [filteredScripts, selectedIndex, runScript, setOpen])

  if (!isOpen) return null

  return (
    <div className="command-palette-overlay" onClick={() => setOpen(false)}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-palette-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search scripts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="command-palette-list">
          {isLoading ? (
            <div className="command-palette-loading">Loading scripts...</div>
          ) : filteredScripts.length === 0 ? (
            <div className="command-palette-empty">
              {scriptEntries.length === 0 ? 'No scripts found in package.json' : 'No matching scripts'}
            </div>
          ) : (
            filteredScripts.map(([name, cmd], index) => (
              <div
                key={name}
                className={`command-palette-item ${index === selectedIndex ? 'selected' : ''} ${isServerScript(name) ? 'server-script' : ''}`}
                onClick={() => runScript(name)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="script-info">
                  {isServerScript(name) && <span className="server-indicator">●</span>}
                  <span className="script-name">{name}</span>
                  <span className="script-cmd">{cmd}</span>
                </div>
                <span className="package-manager-badge">{packageManager}</span>
              </div>
            ))
          )}
        </div>

        <div className="command-palette-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Run</span>
          <span>esc Close</span>
        </div>
      </div>
    </div>
  )
}
