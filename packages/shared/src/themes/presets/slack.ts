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
  description: 'Slack風 紫サイドバー',
  light: {
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
  dark: {
    // Background - Slackダークモード
    'bg-primary': '#1a1d21',
    'bg-secondary': '#222529',
    'bg-tertiary': '#2c2f33',
    'bg-elevated': '#36393f',
    'bg-hover': '#2c2f33',

    // Text
    'text-primary': '#d1d2d3',
    'text-secondary': '#ababad',
    'text-muted': '#72767d',

    // Border
    'border-primary': '#36393f',
    'border-secondary': '#40444b',

    // Accent - Slack公式カラー
    'accent-primary': '#9b59b6',
    'accent-selection': '#3b2940',
    'accent-success': '#2EB67D',
    'accent-warning': '#ECB22E',
    'accent-danger': '#E01E5A',

    // Badges
    'badge-node-bg': '#1a3a2a',
    'badge-node-text': '#5fd4a9',
    'badge-branch-bg': '#3b2940',
    'badge-branch-text': '#c9a0dc',
    'badge-port-bg': '#3d2e0f',
    'badge-port-text': '#ECB22E',

    // Project
    'project-icon': '#ECB22E',

    // Sidebar - Slack紫サイドバー（ダーク時は少し濃く）
    'sidebar-bg': '#350D36',
    'sidebar-text': '#FFFFFF',
    'sidebar-text-secondary': '#c9a0dc',
    'sidebar-hover': '#4A154B',
    'sidebar-active': '#4A154B',
    'sidebar-border': '#2a0a2b',

    // Terminal - ダーク背景のターミナル
    'terminal-bg': '#1a1d21',
    'terminal-fg': '#d1d2d3',
    'terminal-cursor': '#9b59b6',
    'terminal-selection': '#3b2940',
    'terminal-black': '#1a1d21',
    'terminal-red': '#E01E5A',
    'terminal-green': '#2EB67D',
    'terminal-yellow': '#ECB22E',
    'terminal-blue': '#36C5F0',
    'terminal-magenta': '#9b59b6',
    'terminal-cyan': '#36C5F0',
    'terminal-white': '#d1d2d3',
    'terminal-bright-black': '#72767d',
    'terminal-bright-red': '#f14c7f',
    'terminal-bright-green': '#5fd4a9',
    'terminal-bright-yellow': '#f5d063',
    'terminal-bright-blue': '#6dd8f7',
    'terminal-bright-magenta': '#c9a0dc',
    'terminal-bright-cyan': '#6dd8f7',
    'terminal-bright-white': '#ffffff',
  },
}
