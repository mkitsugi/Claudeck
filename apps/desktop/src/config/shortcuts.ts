export type ShortcutCategory = 'app' | 'terminal' | 'claudeck'

export interface Shortcut {
  keys: string
  description: string
  category: ShortcutCategory
}

export const SHORTCUTS: Shortcut[] = [
  // App
  { keys: 'Cmd + K', description: 'コマンドパレットを開く', category: 'app' },
  { keys: 'Cmd + B', description: 'サイドバー開閉', category: 'app' },
  { keys: 'Cmd + .', description: 'ドロップダウンターミナル (グローバル)', category: 'app' },
  { keys: 'Cmd + Q', description: 'アプリを終了', category: 'app' },
  { keys: 'Cmd + W', description: 'ウィンドウを閉じる', category: 'app' },

  // Terminal
  { keys: 'Cmd + C', description: 'コピー', category: 'terminal' },
  { keys: 'Cmd + V', description: 'ペースト', category: 'terminal' },
  { keys: 'Cmd + L', description: '画面クリア', category: 'terminal' },
  { keys: 'Ctrl + C', description: '実行中止', category: 'terminal' },
  { keys: 'Ctrl + D', description: '終了', category: 'terminal' },
  { keys: '↑ / ↓', description: '履歴移動', category: 'terminal' },

  // Claudeck
  { keys: 'Cmd + H', description: 'コマンド履歴', category: 'claudeck' },
  { keys: 'Cmd + 1~4', description: 'ペイン切り替え', category: 'claudeck' },
]

export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  app: '📱 アプリ全体',
  terminal: '💻 ターミナル',
  claudeck: '✨ Claudeck',
}

export function getShortcutsByCategory(): Record<ShortcutCategory, Shortcut[]> {
  return SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<ShortcutCategory, Shortcut[]>)
}
