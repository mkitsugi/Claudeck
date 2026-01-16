import { useEffect, useState, useCallback } from 'react'
import { useCommandStore, type CommandEntry } from '../stores/commandStore'
import { useSessionStore } from '../stores/sessionStore'

interface CommandHistoryProps {
  projectPath: string | null
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

export function CommandHistory({ projectPath }: CommandHistoryProps) {
  const {
    entries,
    favorites,
    isLoading,
    isOpen,
    sortMode,
    setOpen,
    loadCommands,
    toggleFavorite,
    setSortMode,
  } = useCommandStore()
  const { activeSessionId } = useSessionStore()
  const [search, setSearch] = useState('')

  // Load commands on mount and when opened
  useEffect(() => {
    if (isOpen) {
      loadCommands()
    }
  }, [isOpen, loadCommands])

  // Filter and sort commands
  const projectCommands = projectPath
    ? entries.filter((e) => e.projectPath === projectPath)
    : []

  const sortedCommands = [...projectCommands].sort((a, b) => {
    if (sortMode === 'frequency') return b.count - a.count
    return b.lastUsed - a.lastUsed
  })

  const filteredCommands = sortedCommands.filter(
    (e) =>
      e.command.toLowerCase().includes(search.toLowerCase()) && !e.isFavorite
  )

  const filteredFavorites = favorites.filter((e) =>
    e.command.toLowerCase().includes(search.toLowerCase())
  )

  const runCommand = useCallback(
    (command: string) => {
      if (!activeSessionId) return
      window.electronAPI.writeSession(activeSessionId, command + '\n')
      setOpen(false)
    },
    [activeSessionId, setOpen]
  )

  const handleToggleFavorite = useCallback(
    async (e: React.MouseEvent, entry: CommandEntry) => {
      e.stopPropagation()
      await toggleFavorite(entry.command, entry.projectPath)
    },
    [toggleFavorite]
  )

  if (!isOpen) return null

  return (
    <div className="command-history-overlay" onClick={() => setOpen(false)}>
      <div className="command-history" onClick={(e) => e.stopPropagation()}>
        <div className="command-history-header">
          <h3>コマンド履歴</h3>
          <div className="sort-toggle">
            <button
              className={sortMode === 'frequency' ? 'active' : ''}
              onClick={() => setSortMode('frequency')}
            >
              頻度
            </button>
            <button
              className={sortMode === 'recent' ? 'active' : ''}
              onClick={() => setSortMode('recent')}
            >
              最近
            </button>
          </div>
        </div>

        <div className="command-history-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            placeholder="コマンドを検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="command-history-content">
          {isLoading ? (
            <div className="command-history-empty">読み込み中...</div>
          ) : (
            <>
              {filteredFavorites.length > 0 && (
                <div className="command-section">
                  <div className="section-header">★ お気に入り</div>
                  {filteredFavorites.map((entry) => (
                    <div
                      key={`fav-${entry.command}`}
                      className="command-item"
                      onClick={() => runCommand(entry.command)}
                    >
                      <button
                        className="favorite-btn active"
                        onClick={(e) => handleToggleFavorite(e, entry)}
                      >
                        ★
                      </button>
                      <span className="command-text">{entry.command}</span>
                    </div>
                  ))}
                </div>
              )}

              {filteredCommands.length > 0 && (
                <div className="command-section">
                  <div className="section-header">
                    {sortMode === 'frequency' ? '📊 よく使う' : '🕐 最近'}
                  </div>
                  {filteredCommands.slice(0, 20).map((entry) => (
                    <div
                      key={entry.command}
                      className="command-item"
                      onClick={() => runCommand(entry.command)}
                    >
                      <button
                        className="favorite-btn"
                        onClick={(e) => handleToggleFavorite(e, entry)}
                      >
                        ☆
                      </button>
                      <span className="command-text">{entry.command}</span>
                      <span className="command-meta">
                        {sortMode === 'frequency'
                          ? `${entry.count}回`
                          : formatTimeAgo(entry.lastUsed)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {filteredFavorites.length === 0 && filteredCommands.length === 0 && (
                <div className="command-history-empty">
                  {search ? '該当するコマンドがありません' : 'まだ履歴がありません'}
                </div>
              )}
            </>
          )}
        </div>

        <div className="command-history-footer">
          <span>クリックで実行</span>
          <span>esc 閉じる</span>
        </div>
      </div>
    </div>
  )
}
