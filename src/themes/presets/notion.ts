import type { Theme } from '../types'

// Notion公式カラー
// Brand: Black #000000, White #FFFFFF
// Default Text: #37352F
// Gray: #9B9A97
// Accent colors: Blue #0B6E99, Green #0F7B6C, etc.

export const notionTheme: Theme = {
  id: 'notion',
  name: 'Notion',
  description: 'ミニマルなNotion風 白ベース＋黒アクセント',
  colors: {
    // Background - Notionのライトモード
    'bg-primary': '#ffffff',
    'bg-secondary': '#f7f6f3',
    'bg-tertiary': '#f1f1ef',
    'bg-elevated': '#ffffff',
    'bg-hover': '#efefef',

    // Text - Notionの特徴的な茶色がかった黒
    'text-primary': '#37352f',
    'text-secondary': '#787774',
    'text-muted': '#9b9a97',

    // Border - 薄いグレー
    'border-primary': '#e9e9e7',
    'border-secondary': '#dfdfde',

    // Accent - Notion Black
    'accent-primary': '#000000',  // Notion Black
    'accent-selection': '#EBECED',
    'accent-success': '#0f7b6c',  // Notion Green
    'accent-warning': '#D9730D',  // Notion Orange
    'accent-danger': '#e03e3e',   // Notion Red

    // Badges - Notionのパステルカラー
    'badge-node-bg': '#DDEDEA',
    'badge-node-text': '#0f7b6c',
    'badge-branch-bg': '#EBECED',
    'badge-branch-text': '#37352f',
    'badge-port-bg': '#FAEBDD',
    'badge-port-text': '#D9730D',

    // Project
    'project-icon': '#37352f',

    // Sidebar - Notion White/Beige
    'sidebar-bg': '#f7f6f3',
    'sidebar-text': '#37352f',
    'sidebar-text-secondary': '#9B9A97',
    'sidebar-hover': '#efefef',
    'sidebar-active': '#EBECED',
    'sidebar-border': '#e9e9e7',

    // Terminal - Notion風ライトターミナル
    'terminal-bg': '#ffffff',
    'terminal-fg': '#37352f',
    'terminal-cursor': '#37352f',
    'terminal-selection': '#d3e5ef',
    'terminal-black': '#37352f',
    'terminal-red': '#e03e3e',
    'terminal-green': '#0f7b6c',
    'terminal-yellow': '#9f6b00',
    'terminal-blue': '#2eaadc',
    'terminal-magenta': '#6940a5',
    'terminal-cyan': '#0891b2',
    'terminal-white': '#f7f6f3',
    'terminal-bright-black': '#787774',
    'terminal-bright-red': '#f56565',
    'terminal-bright-green': '#4dab9a',
    'terminal-bright-yellow': '#dfab01',
    'terminal-bright-blue': '#5dc3e8',
    'terminal-bright-magenta': '#9065b0',
    'terminal-bright-cyan': '#36b4c7',
    'terminal-bright-white': '#ffffff',
  },
}
