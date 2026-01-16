import { Plus, X } from 'lucide-react'
import { useSessionStore } from '../stores/sessionStore'
import type { Session } from '../types'

interface TerminalTabsProps {
  sessions: Session[]
  onNewSession: () => void
  onCloseSession: (sessionId: string) => void
}

export function TerminalTabs({ sessions, onNewSession, onCloseSession }: TerminalTabsProps) {
  const { activeSessionId, setActiveSession } = useSessionStore()

  return (
    <div className="terminal-tabs">
      {sessions.map((session, index) => (
        <div
          key={session.id}
          className={`terminal-tab ${activeSessionId === session.id ? 'active' : ''}`}
          onClick={() => setActiveSession(session.id)}
        >
          <span className="tab-name">Session {index + 1}</span>
          <button
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation()
              onCloseSession(session.id)
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button className="new-tab-btn" onClick={onNewSession}>
        <Plus size={16} />
      </button>
    </div>
  )
}
