export type ThemeId = 'dark' | 'slack' | 'notion' | 'claude'

export interface ThemeColors {
  // Background
  'bg-primary': string
  'bg-secondary': string
  'bg-tertiary': string
  'bg-elevated': string
  'bg-hover': string

  // Text
  'text-primary': string
  'text-secondary': string
  'text-muted': string

  // Border
  'border-primary': string
  'border-secondary': string

  // Accent
  'accent-primary': string
  'accent-selection': string
  'accent-success': string
  'accent-warning': string
  'accent-danger': string

  // Badges
  'badge-node-bg': string
  'badge-node-text': string
  'badge-branch-bg': string
  'badge-branch-text': string
  'badge-port-bg': string
  'badge-port-text': string

  // Project
  'project-icon': string

  // Sidebar
  'sidebar-bg': string
  'sidebar-text': string
  'sidebar-text-secondary': string
  'sidebar-hover': string
  'sidebar-active': string
  'sidebar-border': string

  // Terminal (xterm)
  'terminal-bg': string
  'terminal-fg': string
  'terminal-cursor': string
  'terminal-selection': string
  'terminal-black': string
  'terminal-red': string
  'terminal-green': string
  'terminal-yellow': string
  'terminal-blue': string
  'terminal-magenta': string
  'terminal-cyan': string
  'terminal-white': string
  'terminal-bright-black': string
  'terminal-bright-red': string
  'terminal-bright-green': string
  'terminal-bright-yellow': string
  'terminal-bright-blue': string
  'terminal-bright-magenta': string
  'terminal-bright-cyan': string
  'terminal-bright-white': string
}

export interface Theme {
  id: ThemeId
  name: string
  description: string
  colors: ThemeColors
}
