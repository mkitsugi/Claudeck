import type { Theme } from '../types'

export const notionTheme: Theme = {
  id: 'notion',
  name: 'Notion',
  description: 'ミニマルで温かみのあるNotion風',
  colors: {
    // Background - Notionのライトモード（温かみのあるベージュ系）
    'bg-primary': '#ffffff',
    'bg-secondary': '#f7f6f3',
    'bg-tertiary': '#f1f1ef',
    'bg-elevated': '#ffffff',
    'bg-hover': '#efefef',

    // Text - Notionの特徴的な茶色がかった黒
    'text-primary': '#37352f',
    'text-secondary': '#787774',
    'text-muted': '#9b9a97',

    // Border
    'border-primary': '#e9e9e7',
    'border-secondary': '#dfdfde',

    // Accent - Notionのブルー＆ニュートラルカラー
    'accent-primary': '#2eaadc',
    'accent-selection': '#d3e5ef',
    'accent-success': '#0f7b6c',
    'accent-warning': '#dfab01',
    'accent-danger': '#e03e3e',

    // Badges - Notionのパステルカラー
    'badge-node-bg': '#dbeddb',
    'badge-node-text': '#0f7b6c',
    'badge-branch-bg': '#e8deee',
    'badge-branch-text': '#6940a5',
    'badge-port-bg': '#fdecc8',
    'badge-port-text': '#9f6b00',

    // Project
    'project-icon': '#dfab01',

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
