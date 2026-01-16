// Hooks Config Manager - Manages Claude Code hooks configuration
import fs from 'fs'
import path from 'path'
import os from 'os'

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')
const CLAUDECK_HOOKS_DIR = path.join(os.homedir(), '.claudeck', 'hooks')
const HOOK_SCRIPT_PATH = path.join(CLAUDECK_HOOKS_DIR, 'claudeck-hook.sh')
const HOOKS_PORT = 52429

interface ClaudeSettings {
  hooks?: {
    PreToolUse?: HookConfig[]
    PostToolUse?: HookConfig[]
    Stop?: HookConfig[]
    SubagentStop?: HookConfig[]
    UserPromptSubmit?: HookConfig[]
    [key: string]: HookConfig[] | undefined
  }
  [key: string]: unknown
}

interface HookConfig {
  matcher: string
  hooks: Array<{
    type: string
    command: string
  }>
}

export interface HooksStatus {
  isConfigured: boolean
  hasScript: boolean
  hasSettings: boolean
  missingHooks: string[]
}

const REQUIRED_HOOKS = ['PreToolUse', 'PostToolUse', 'Stop', 'UserPromptSubmit', 'PermissionRequest']

class HooksConfigManager {
  // Check if Claudeck hooks are properly configured
  checkStatus(): HooksStatus {
    const hasScript = this.isScriptInstalled()
    const { hasSettings, missingHooks } = this.checkClaudeSettings()

    return {
      isConfigured: hasScript && hasSettings && missingHooks.length === 0,
      hasScript,
      hasSettings,
      missingHooks,
    }
  }

  // Check if hook script is installed
  private isScriptInstalled(): boolean {
    try {
      return fs.existsSync(HOOK_SCRIPT_PATH)
    } catch {
      return false
    }
  }

  // Check Claude settings for required hooks
  private checkClaudeSettings(): { hasSettings: boolean; missingHooks: string[] } {
    try {
      if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) {
        return { hasSettings: false, missingHooks: REQUIRED_HOOKS }
      }

      const content = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8')
      const settings = JSON.parse(content) as ClaudeSettings

      if (!settings.hooks) {
        return { hasSettings: true, missingHooks: REQUIRED_HOOKS }
      }

      const missingHooks: string[] = []
      for (const hookName of REQUIRED_HOOKS) {
        const hookConfigs = settings.hooks[hookName]
        if (!hookConfigs || !this.hasClaudeckHook(hookConfigs)) {
          missingHooks.push(hookName)
        }
      }

      return { hasSettings: true, missingHooks }
    } catch {
      return { hasSettings: false, missingHooks: REQUIRED_HOOKS }
    }
  }

  // Check if hook config contains Claudeck hook
  private hasClaudeckHook(hookConfigs: HookConfig[]): boolean {
    return hookConfigs.some(config =>
      config.hooks?.some(h => h.command?.includes('claudeck-hook'))
    )
  }

  // Install hook script
  installScript(): void {
    // Create hooks directory
    fs.mkdirSync(CLAUDECK_HOOKS_DIR, { recursive: true })

    // Write hook script
    const scriptContent = `#!/bin/bash
# Claudeck Hook Script - Forwards Claude Code hook events to Claudeck
# This script receives JSON via stdin and sends it to the local Claudeck server

curl -s -X POST "http://127.0.0.1:${HOOKS_PORT}/hook" \\
  -H "Content-Type: application/json" \\
  -d @- 2>/dev/null || true

# Always exit successfully to not block Claude Code
exit 0
`
    fs.writeFileSync(HOOK_SCRIPT_PATH, scriptContent, { mode: 0o755 })
    console.log(`[HooksConfigManager] Installed hook script: ${HOOK_SCRIPT_PATH}`)
  }

  // Add Claudeck hooks to Claude settings
  addHooksToSettings(): void {
    let settings: ClaudeSettings = {}

    // Read existing settings
    try {
      if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
        const content = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8')
        settings = JSON.parse(content) as ClaudeSettings
      }
    } catch (e) {
      console.warn('[HooksConfigManager] Failed to read existing settings:', e)
    }

    // Initialize hooks section if needed
    if (!settings.hooks) {
      settings.hooks = {}
    }

    // Add Claudeck hook to each required hook type
    const claudeckHookConfig = {
      type: 'command',
      command: HOOK_SCRIPT_PATH,
    }

    for (const hookName of REQUIRED_HOOKS) {
      // PreToolUse, PostToolUse, and PermissionRequest use '*' to match all
      const matcher = ['PreToolUse', 'PostToolUse', 'PermissionRequest'].includes(hookName) ? '*' : ''
      const existingConfigs = settings.hooks[hookName] || []

      // Check if Claudeck hook already exists
      if (!this.hasClaudeckHook(existingConfigs)) {
        existingConfigs.push({
          matcher,
          hooks: [claudeckHookConfig],
        })
        settings.hooks[hookName] = existingConfigs
      }
    }

    // Ensure .claude directory exists
    const claudeDir = path.dirname(CLAUDE_SETTINGS_PATH)
    fs.mkdirSync(claudeDir, { recursive: true })

    // Write updated settings
    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2))
    console.log(`[HooksConfigManager] Updated Claude settings: ${CLAUDE_SETTINGS_PATH}`)
  }

  // Full setup: install script and add hooks to settings
  setupAll(): { success: boolean; error?: string } {
    try {
      this.installScript()
      this.addHooksToSettings()
      return { success: true }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      console.error('[HooksConfigManager] Setup failed:', error)
      return { success: false, error }
    }
  }

  // Remove Claudeck hooks from settings
  removeHooksFromSettings(): void {
    try {
      if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) return

      const content = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8')
      const settings = JSON.parse(content) as ClaudeSettings

      if (!settings.hooks) return

      // Remove Claudeck hooks from each hook type
      for (const hookName of Object.keys(settings.hooks)) {
        const hookConfigs = settings.hooks[hookName]
        if (hookConfigs) {
          settings.hooks[hookName] = hookConfigs.filter(
            config => !config.hooks?.some(h => h.command?.includes('claudeck-hook'))
          )
          // Remove empty arrays
          if (settings.hooks[hookName]?.length === 0) {
            delete settings.hooks[hookName]
          }
        }
      }

      // Remove empty hooks section
      if (Object.keys(settings.hooks).length === 0) {
        delete settings.hooks
      }

      fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2))
      console.log('[HooksConfigManager] Removed Claudeck hooks from settings')
    } catch (e) {
      console.error('[HooksConfigManager] Failed to remove hooks:', e)
    }
  }

  // Get paths for display
  getPaths() {
    return {
      script: HOOK_SCRIPT_PATH,
      settings: CLAUDE_SETTINGS_PATH,
      hooksDir: CLAUDECK_HOOKS_DIR,
    }
  }
}

export const hooksConfigManager = new HooksConfigManager()
