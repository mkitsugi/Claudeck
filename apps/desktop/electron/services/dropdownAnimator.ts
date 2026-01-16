import type { BrowserWindow } from 'electron'

export class DropdownAnimator {
  private animationTimer: ReturnType<typeof setTimeout> | null = null
  private isAnimating = false

  async slideIn(window: BrowserWindow, targetY: number, duration: number): Promise<void> {
    this.cancel()
    this.isAnimating = true

    const bounds = window.getBounds()
    const startY = bounds.y
    const startTime = Date.now()

    return new Promise((resolve) => {
      const animate = () => {
        if (!this.isAnimating) {
          resolve()
          return
        }

        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Ease-out-cubic
        const eased = 1 - Math.pow(1 - progress, 3)

        const currentY = startY + (targetY - startY) * eased
        const currentBounds = window.getBounds()
        window.setBounds({ ...currentBounds, y: Math.round(currentY) })

        if (progress < 1) {
          this.animationTimer = setTimeout(animate, 16) // ~60fps
        } else {
          this.isAnimating = false
          resolve()
        }
      }

      window.showInactive()
      animate()
    })
  }

  async slideOut(window: BrowserWindow, targetY: number, duration: number): Promise<void> {
    this.cancel()
    this.isAnimating = true

    const bounds = window.getBounds()
    const startY = bounds.y
    const startTime = Date.now()

    return new Promise((resolve) => {
      const animate = () => {
        if (!this.isAnimating) {
          resolve()
          return
        }

        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Ease-in-cubic
        const eased = Math.pow(progress, 3)

        const currentY = startY + (targetY - startY) * eased
        const currentBounds = window.getBounds()
        window.setBounds({ ...currentBounds, y: Math.round(currentY) })

        if (progress < 1) {
          this.animationTimer = setTimeout(animate, 16)
        } else {
          this.isAnimating = false
          window.hide()
          resolve()
        }
      }

      animate()
    })
  }

  cancel(): void {
    this.isAnimating = false
    if (this.animationTimer) {
      clearTimeout(this.animationTimer)
      this.animationTimer = null
    }
  }
}

export const dropdownAnimator = new DropdownAnimator()
