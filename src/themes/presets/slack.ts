import type { Theme } from '../types'

// Slack公式カラー
// Aubergine: #4A154B (サイドバー)
// Blue: #36C5F0
// Green: #2EB67D
// Yellow: #ECB22E
// Red: #E01E5A
// Text: #1d1c1d

export const slackTheme: Theme = {
  id: 'slack',
  name: 'Slack',
  description: 'Slack風 紫サイドバー＋ライトテーマ',
  colors: {
    // Background - Slackのライトモード
    'bg-primary': '#ffffff',
    'bg-secondary': '#f8f8f8',
    'bg-tertiary': '#f0f0f0',
    'bg-elevated': '#ffffff',
    'bg-hover': '#f0f0f5',

    // Text - Slackの濃いグレー
    'text-primary': '#1d1c1d',
    'text-secondary': '#616061',
    'text-muted': '#868686',

    // Border
    'border-primary': '#dddddd',
    'border-secondary': '#e8e8e8',

    // Accent - Slack公式カラー
    'accent-primary': '#7C3085',  // 明るい紫
    'accent-selection': '#f3e8ff',
    'accent-success': '#2EB67D',  // Slack Green
    'accent-warning': '#ECB22E',  // Slack Yellow
    'accent-danger': '#E01E5A',   // Slack Red

    // Badges
    'badge-node-bg': '#e5f7ed',
    'badge-node-text': '#2EB67D',
    'badge-branch-bg': '#f3e8ff',
    'badge-branch-text': '#4A154B',
    'badge-port-bg': '#fef9e8',
    'badge-port-text': '#b45309',

    // Project
    'project-icon': '#ECB22E',

    // Sidebar - Slack紫サイドバー！
    'sidebar-bg': '#4A154B',         // Slack Aubergine
    'sidebar-text': '#FFFFFF',
    'sidebar-text-secondary': '#E8D5E8',
    'sidebar-hover': '#611F69',
    'sidebar-active': '#611F69',
    'sidebar-border': '#350D36',

    // Terminal - ライト背景のターミナル
    'terminal-bg': '#ffffff',
    'terminal-fg': '#1d1c1d',
    'terminal-cursor': '#4A154B',
    'terminal-selection': '#e8d5f9',
    'terminal-black': '#1d1c1d',
    'terminal-red': '#E01E5A',
    'terminal-green': '#2EB67D',
    'terminal-yellow': '#b45309',
    'terminal-blue': '#36C5F0',
    'terminal-magenta': '#4A154B',
    'terminal-cyan': '#36C5F0',
    'terminal-white': '#f8f8f8',
    'terminal-bright-black': '#616061',
    'terminal-bright-red': '#f14c7f',
    'terminal-bright-green': '#5fd4a9',
    'terminal-bright-yellow': '#ECB22E',
    'terminal-bright-blue': '#6dd8f7',
    'terminal-bright-magenta': '#7c3085',
    'terminal-bright-cyan': '#6dd8f7',
    'terminal-bright-white': '#ffffff',
  },
}
