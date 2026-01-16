import type { Theme } from '../types'

export const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark',
  description: 'デフォルトのダークテーマ（VS Code風）',
  light: {
    // Background - VS Code Light風
    'bg-primary': '#ffffff',
    'bg-secondary': '#f3f3f3',
    'bg-tertiary': '#ececec',
    'bg-elevated': '#ffffff',
    'bg-hover': '#e8e8e8',

    // Text
    'text-primary': '#1e1e1e',
    'text-secondary': '#6e6e6e',
    'text-muted': '#999999',

    // Border
    'border-primary': '#e0e0e0',
    'border-secondary': '#d0d0d0',

    // Accent
    'accent-primary': '#007acc',
    'accent-selection': '#add6ff',
    'accent-success': '#16825d',
    'accent-warning': '#bf8803',
    'accent-danger': '#cd3131',

    // Badges
    'badge-node-bg': '#d4edda',
    'badge-node-text': '#155724',
    'badge-branch-bg': '#e2d5f1',
    'badge-branch-text': '#4a3c6e',
    'badge-port-bg': '#fff3cd',
    'badge-port-text': '#856404',

    // Project
    'project-icon': '#c49a6c',

    // Sidebar
    'sidebar-bg': '#f3f3f3',
    'sidebar-text': '#1e1e1e',
    'sidebar-text-secondary': '#6e6e6e',
    'sidebar-hover': '#e8e8e8',
    'sidebar-active': '#add6ff',
    'sidebar-border': '#e0e0e0',

    // Terminal (xterm)
    'terminal-bg': '#ffffff',
    'terminal-fg': '#1e1e1e',
    'terminal-cursor': '#1e1e1e',
    'terminal-selection': '#add6ff',
    'terminal-black': '#000000',
    'terminal-red': '#cd3131',
    'terminal-green': '#16825d',
    'terminal-yellow': '#bf8803',
    'terminal-blue': '#0451a5',
    'terminal-magenta': '#bc3fbc',
    'terminal-cyan': '#0598bc',
    'terminal-white': '#1e1e1e',
    'terminal-bright-black': '#666666',
    'terminal-bright-red': '#cd3131',
    'terminal-bright-green': '#14ce14',
    'terminal-bright-yellow': '#b5ba00',
    'terminal-bright-blue': '#0451a5',
    'terminal-bright-magenta': '#bc05bc',
    'terminal-bright-cyan': '#0598bc',
    'terminal-bright-white': '#a5a5a5',
  },
  dark: {
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
