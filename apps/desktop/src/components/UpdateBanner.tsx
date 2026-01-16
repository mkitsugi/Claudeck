import { useState, useEffect } from 'react'
import { Download, X, RefreshCw } from 'lucide-react'
import { UpdateInfo, UpdateProgress } from '../types'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'

export function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<UpdateProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsubChecking = window.electronAPI.onUpdateChecking(() => {
      setStatus('checking')
    })

    const unsubAvailable = window.electronAPI.onUpdateAvailable((info: UpdateInfo) => {
      setStatus('available')
      setUpdateInfo(info)
      setDismissed(false)
    })

    const unsubNotAvailable = window.electronAPI.onUpdateNotAvailable(() => {
      setStatus('idle')
    })

    const unsubProgress = window.electronAPI.onUpdateProgress((prog: UpdateProgress) => {
      setStatus('downloading')
      setProgress(prog)
    })

    const unsubDownloaded = window.electronAPI.onUpdateDownloaded((info: UpdateInfo) => {
      setStatus('downloaded')
      setUpdateInfo(info)
    })

    const unsubError = window.electronAPI.onUpdateError((err: string) => {
      setStatus('error')
      setError(err)
    })

    // Check for updates on mount
    window.electronAPI.checkForUpdates()

    return () => {
      unsubChecking()
      unsubAvailable()
      unsubNotAvailable()
      unsubProgress()
      unsubDownloaded()
      unsubError()
    }
  }, [])

  const handleDownload = () => {
    window.electronAPI.downloadUpdate()
  }

  const handleInstall = () => {
    window.electronAPI.installUpdate()
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  if (dismissed || status === 'idle' || status === 'checking') {
    return null
  }

  return (
    <div className="bg-[#0e639c] text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        {status === 'available' && (
          <>
            <Download size={16} />
            <span>
              v{updateInfo?.version} が利用可能です
            </span>
          </>
        )}
        {status === 'downloading' && (
          <>
            <RefreshCw size={16} className="animate-spin" />
            <span>
              ダウンロード中... {progress ? `${Math.round(progress.percent)}%` : ''}
            </span>
          </>
        )}
        {status === 'downloaded' && (
          <>
            <Download size={16} />
            <span>
              v{updateInfo?.version} のダウンロードが完了しました
            </span>
          </>
        )}
        {status === 'error' && (
          <span className="text-red-200">
            アップデートエラー: {error}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {status === 'available' && (
          <button
            onClick={handleDownload}
            className="px-3 py-1 bg-white text-[#0e639c] rounded hover:bg-gray-100 font-medium"
          >
            ダウンロード
          </button>
        )}
        {status === 'downloaded' && (
          <button
            onClick={handleInstall}
            className="px-3 py-1 bg-white text-[#0e639c] rounded hover:bg-gray-100 font-medium"
          >
            再起動してインストール
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-white/20 rounded"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
