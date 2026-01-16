import type { Theme, ThemeId } from './types'
import { darkTheme } from './presets/dark'
import { slackTheme } from './presets/slack'
import { notionTheme } from './presets/notion'
import { claudeTheme } from './presets/claude'

// テーマのレジストリ
export const themes: Record<ThemeId, Theme> = {
  dark: darkTheme,
  slack: slackTheme,
  notion: notionTheme,
  claude: claudeTheme,
}

// テーマリスト（UI用）
export const themeList: Theme[] = Object.values(themes)

export { darkTheme, slackTheme, notionTheme, claudeTheme }
export * from './types'
