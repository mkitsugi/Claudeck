import type { Theme } from '../types'

// Claude/Anthropic公式カラー
// Terra Cotta (Crail): #da7756 または #C15F3C
// Pampas (背景): #F4F3EE
// Cloudy (グレー): #B1ADA1
// White: #FFFFFF
// Black: #000000

export const claudeTheme: Theme = {
  id: 'claude',
  name: 'Claude',
  description: '温かみのあるClaude.ai風',
  colors: {
    // Background - Claude公式のPampas系
    'bg-primary': '#F4F3EE',
    'bg-secondary': '#ebe9e3',
    'bg-tertiary': '#e2e0d9',
    'bg-elevated': '#ffffff',
    'bg-hover': '#e8e6df',

    // Text - Claudeの落ち着いたトーン
    'text-primary': '#1a1a1a',
    'text-secondary': '#5c5c5c',
    'text-muted': '#B1ADA1',  // Cloudy

    // Border
    'border-primary': '#dedad0',
    'border-secondary': '#d1cdc3',

    // Accent - Claude公式Terra Cotta
    'accent-primary': '#da7756',
    'accent-selection': '#fce8e0',
    'accent-success': '#2EB67D',
    'accent-warning': '#da7756',
    'accent-danger': '#dc2626',

    // Badges - 温かみのあるパステルカラー
    'badge-node-bg': '#dcfce7',
    'badge-node-text': '#16a34a',
    'badge-branch-bg': '#fce8e0',
    'badge-branch-text': '#da7756',
    'badge-port-bg': '#fef3c7',
    'badge-port-text': '#b45309',

    // Project
    'project-icon': '#da7756',

    // Sidebar - Claude Terra Cotta
    'sidebar-bg': '#da7756',
    'sidebar-text': '#FFFFFF',
    'sidebar-text-secondary': '#FFE4D9',
    'sidebar-hover': '#c96a4c',
    'sidebar-active': '#b85d40',
    'sidebar-border': '#c96a4c',

    // Terminal - Claude風の温かいライトターミナル
    'terminal-bg': '#F4F3EE',
    'terminal-fg': '#1a1a1a',
    'terminal-cursor': '#da7756',
    'terminal-selection': '#fce8e0',
    'terminal-black': '#1a1a1a',
    'terminal-red': '#dc2626',
    'terminal-green': '#16a34a',
    'terminal-yellow': '#b45309',
    'terminal-blue': '#2563eb',
    'terminal-magenta': '#da7756',
    'terminal-cyan': '#0891b2',
    'terminal-white': '#F4F3EE',
    'terminal-bright-black': '#5c5c5c',
    'terminal-bright-red': '#f87171',
    'terminal-bright-green': '#4ade80',
    'terminal-bright-yellow': '#fbbf24',
    'terminal-bright-blue': '#60a5fa',
    'terminal-bright-magenta': '#e9967a',
    'terminal-bright-cyan': '#22d3ee',
    'terminal-bright-white': '#ffffff',
  },
}
