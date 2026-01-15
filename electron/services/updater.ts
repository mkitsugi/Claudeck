import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'

let mainWindow: BrowserWindow | null = null

export function initUpdater(window: BrowserWindow) {
  mainWindow = window

  // Don't auto-download, let user decide
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Check for updates
  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('updater:checking')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    sendToRenderer('updater:available', info)
  })

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    sendToRenderer('updater:not-available', info)
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('updater:progress', progress)
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    sendToRenderer('updater:downloaded', info)
  })

  autoUpdater.on('error', (error) => {
    sendToRenderer('updater:error', error.message)
  })
}

function sendToRenderer(channel: string, data?: unknown) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

export function setupUpdaterIpc() {
  ipcMain.handle('updater:check', async () => {
    try {
      return await autoUpdater.checkForUpdates()
    } catch (error) {
      console.error('Update check failed:', error)
      return null
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
    } catch (error) {
      console.error('Download failed:', error)
    }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.handle('updater:get-version', () => {
    return autoUpdater.currentVersion.version
  })
}
