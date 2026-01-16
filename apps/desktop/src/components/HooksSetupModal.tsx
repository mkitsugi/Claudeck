import { useState, useEffect } from 'react'
import { X, Check, AlertCircle, Settings, Terminal, FileCode } from 'lucide-react'

interface HooksStatus {
  isConfigured: boolean
  hasScript: boolean
  hasSettings: boolean
  missingHooks: string[]
}

interface HooksPaths {
  script: string
  settings: string
  hooksDir: string
}

interface HooksSetupModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HooksSetupModal({ isOpen, onClose }: HooksSetupModalProps) {
  const [status, setStatus] = useState<HooksStatus | null>(null)
  const [paths, setPaths] = useState<HooksPaths | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [setupResult, setSetupResult] = useState<{ success: boolean; error?: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadStatus()
    }
  }, [isOpen])

  const loadStatus = async () => {
    try {
      const [statusResult, pathsResult] = await Promise.all([
        window.electronAPI.checkHooksStatus(),
        window.electronAPI.getHooksPaths(),
      ])
      setStatus(statusResult as HooksStatus)
      setPaths(pathsResult as HooksPaths)
    } catch (e) {
      console.error('Failed to check hooks status:', e)
    }
  }

  const handleSetup = async () => {
    setIsLoading(true)
    setSetupResult(null)
    try {
      const result = await window.electronAPI.setupHooks() as { success: boolean; error?: string }
      setSetupResult(result)
      if (result.success) {
        await loadStatus()
      }
    } catch (e) {
      setSetupResult({ success: false, error: String(e) })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content hooks-setup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Settings size={20} /> Claude Code Hooks Setup</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p className="hooks-description">
            Claude Code Hooksを設定すると、Claudeの状態（処理中・入力待ち・アイドル）を
            正確に検出できるようになります。
          </p>

          {status && (
            <div className="hooks-status">
              <h3>現在のステータス</h3>
              <div className="status-items">
                <div className={`status-item ${status.hasScript ? 'ok' : 'missing'}`}>
                  <Terminal size={16} />
                  <span>フックスクリプト</span>
                  {status.hasScript ? <Check size={16} /> : <AlertCircle size={16} />}
                </div>
                <div className={`status-item ${status.hasSettings ? 'ok' : 'missing'}`}>
                  <FileCode size={16} />
                  <span>Claude Code設定</span>
                  {status.hasSettings ? <Check size={16} /> : <AlertCircle size={16} />}
                </div>
                {status.missingHooks.length > 0 && (
                  <div className="missing-hooks">
                    <span>未設定のフック: {status.missingHooks.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {paths && (
            <div className="hooks-paths">
              <h3>設定ファイルのパス</h3>
              <div className="path-item">
                <span className="path-label">スクリプト:</span>
                <code>{paths.script}</code>
              </div>
              <div className="path-item">
                <span className="path-label">Claude設定:</span>
                <code>{paths.settings}</code>
              </div>
            </div>
          )}

          {setupResult && (
            <div className={`setup-result ${setupResult.success ? 'success' : 'error'}`}>
              {setupResult.success ? (
                <><Check size={16} /> セットアップ完了！</>
              ) : (
                <><AlertCircle size={16} /> エラー: {setupResult.error}</>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {status?.isConfigured ? (
            <button className="btn btn-secondary" onClick={onClose}>
              閉じる
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onClose}>
                後で
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSetup}
                disabled={isLoading}
              >
                {isLoading ? 'セットアップ中...' : 'Hooksをセットアップ'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
