import type { Theme } from '../types'

// Notion公式カラー
// Brand: Black #000000, White #FFFFFF
// Default Text: #37352F
// Gray: #9B9A97
// Accent colors: Blue #0B6E99, Green #0F7B6C, etc.

export const notionTheme: Theme = {
  id: 'notion',
  name: 'Notion',
  description: 'ミニマルなNotion風',
  light: {
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
  dark: {
    // Background - Notionダークモード
    'bg-primary': '#191919',
    'bg-secondary': '#202020',
    'bg-tertiary': '#2f2f2f',
    'bg-elevated': '#373737',
    'bg-hover': '#2f2f2f',

    // Text
    'text-primary': '#e6e6e5',
    'text-secondary': '#9b9a97',
    'text-muted': '#6b6b6b',

    // Border
    'border-primary': '#373737',
    'border-secondary': '#454545',

    // Accent - Notion White (ダーク時は白アクセント)
    'accent-primary': '#ffffff',
    'accent-selection': '#373737',
    'accent-success': '#4dab9a',
    'accent-warning': '#f5a623',
    'accent-danger': '#f56565',

    // Badges
    'badge-node-bg': '#1a3a35',
    'badge-node-text': '#4dab9a',
    'badge-branch-bg': '#373737',
    'badge-branch-text': '#e6e6e5',
    'badge-port-bg': '#3d2e0f',
    'badge-port-text': '#f5a623',

    // Project
    'project-icon': '#e6e6e5',

    // Sidebar - Notion Dark
    'sidebar-bg': '#202020',
    'sidebar-text': '#e6e6e5',
    'sidebar-text-secondary': '#9b9a97',
    'sidebar-hover': '#2f2f2f',
    'sidebar-active': '#373737',
    'sidebar-border': '#373737',

    // Terminal - Notion風ダークターミナル
    'terminal-bg': '#191919',
    'terminal-fg': '#e6e6e5',
    'terminal-cursor': '#e6e6e5',
    'terminal-selection': '#373737',
    'terminal-black': '#191919',
    'terminal-red': '#f56565',
    'terminal-green': '#4dab9a',
    'terminal-yellow': '#f5a623',
    'terminal-blue': '#5dc3e8',
    'terminal-magenta': '#9065b0',
    'terminal-cyan': '#36b4c7',
    'terminal-white': '#e6e6e5',
    'terminal-bright-black': '#6b6b6b',
    'terminal-bright-red': '#fc8181',
    'terminal-bright-green': '#68d5b7',
    'terminal-bright-yellow': '#ffc148',
    'terminal-bright-blue': '#7dd6f5',
    'terminal-bright-magenta': '#ab85c6',
    'terminal-bright-cyan': '#5cc5d8',
    'terminal-bright-white': '#ffffff',
  },
}
