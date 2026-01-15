import type { Theme } from '../types'

export const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark',
  description: 'デフォルトのダークテーマ（VS Code風）',
  colors: {
    // Background
    'bg-primary': '#1e1e1e',
    'bg-secondary': '#252526',
    'bg-tertiary': '#2d2d2d',
    'bg-elevated': '#3c3c3c',
    'bg-hover': '#2a2d2e',

    // Text
    'text-primary': '#d4d4d4',
    'text-secondary': '#808080',
    'text-muted': '#666666',

    // Border
    'border-primary': '#3c3c3c',
    'border-secondary': '#4a4a4a',

    // Accent
    'accent-primary': '#007acc',
    'accent-selection': '#094771',
    'accent-success': '#0dbc79',
    'accent-warning': '#f5c542',
    'accent-danger': '#cd3131',

    // Badges
    'badge-node-bg': '#2e5c2e',
    'badge-node-text': '#7fcc7f',
    'badge-branch-bg': '#4a3c6e',
    'badge-branch-text': '#b8a8d8',
    'badge-port-bg': '#5c4a2e',
    'badge-port-text': '#ccb87f',

    // Project
    'project-icon': '#dcb67a',

    // Sidebar
    'sidebar-bg': '#252526',
    'sidebar-text': '#d4d4d4',
    'sidebar-text-secondary': '#808080',
    'sidebar-hover': '#2a2d2e',
    'sidebar-active': '#094771',
    'sidebar-border': '#3c3c3c',

    // Terminal (xterm)
    'terminal-bg': '#1e1e1e',
    'terminal-fg': '#d4d4d4',
    'terminal-cursor': '#d4d4d4',
    'terminal-selection': '#264f78',
    'terminal-black': '#000000',
    'terminal-red': '#cd3131',
    'terminal-green': '#0dbc79',
    'terminal-yellow': '#e5e510',
    'terminal-blue': '#2472c8',
    'terminal-magenta': '#bc3fbc',
    'terminal-cyan': '#11a8cd',
    'terminal-white': '#e5e5e5',
    'terminal-bright-black': '#666666',
    'terminal-bright-red': '#f14c4c',
    'terminal-bright-green': '#23d18b',
    'terminal-bright-yellow': '#f5f543',
    'terminal-bright-blue': '#3b8eea',
    'terminal-bright-magenta': '#d670d6',
    'terminal-bright-cyan': '#29b8db',
    'terminal-bright-white': '#ffffff',
  },
}
