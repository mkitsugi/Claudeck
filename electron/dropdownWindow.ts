import { BrowserWindow, screen } from 'electron'

export interface DropdownConfig {
  widthPercent: number
  height: number
  animationDuration: number
}

const DEFAULT_CONFIG: DropdownConfig = {
  widthPercent: 1.0,  // Full width
  height: 400,
  animationDuration: 200,
}

export function createDropdownWindow(preloadPath: string, config: Partial<DropdownConfig> = {}): BrowserWindow {
  const { widthPercent, height } = { ...DEFAULT_CONFIG, ...config }
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize

  const windowWidth = Math.floor(screenWidth * widthPercent)
  const x = Math.floor((screenWidth - windowWidth) / 2)

  const win = new BrowserWindow({
    width: windowWidth,
    height: height,
    x: x,
    y: -height, // Start above screen
    frame: false,
    transparent: true,
    resizable: true,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    show: false,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    hasShadow: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Prevent window from being closed, just hide it
  win.on('close', (e) => {
    e.preventDefault()
    win.hide()
  })

  return win
}

export function getDropdownTargetY(): number {
  // Target Y is 0 (top of screen)
  return 0
}

export function getDropdownHiddenY(height: number): number {
  return -height
}
