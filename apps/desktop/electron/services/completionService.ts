import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { loadCommands } from './commandStorage'

export interface CompletionRequest {
  input: string
  cwd: string
  projectPath: string
}

export interface CompletionResult {
  suggestion: string | null
  type: 'path' | 'history' | 'git' | 'command' | null
  completion: string // The part to be inserted (ghost text)
}

// Git subcommands for completion
const GIT_SUBCOMMANDS = [
  'add', 'branch', 'checkout', 'clone', 'commit', 'diff', 'fetch',
  'init', 'log', 'merge', 'pull', 'push', 'rebase', 'reset',
  'restore', 'show', 'stash', 'status', 'switch', 'tag'
]

// Common commands for basic completion
const COMMON_COMMANDS = [
  'cd', 'ls', 'cat', 'rm', 'mkdir', 'mv', 'cp', 'pwd', 'echo',
  'grep', 'find', 'chmod', 'chown', 'curl', 'wget', 'tar', 'zip',
  'npm', 'pnpm', 'yarn', 'bun', 'node', 'python', 'python3',
  'git', 'docker', 'code', 'vim', 'nano'
]

export function getCompletion(request: CompletionRequest): CompletionResult {
  const { input, cwd, projectPath } = request
  const trimmedInput = input.trim()

  if (!trimmedInput) {
    return { suggestion: null, type: null, completion: '' }
  }

  // Try completions in order of priority
  // 1. Git completion (if starts with "git ")
  if (trimmedInput.startsWith('git ')) {
    const result = getGitCompletion(trimmedInput, cwd)
    if (result.suggestion) return result
  }

  // 2. Path completion (if contains / or starts with . or ~)
  if (trimmedInput.includes('/') || trimmedInput.startsWith('.') || trimmedInput.startsWith('~')) {
    const result = getPathCompletion(trimmedInput, cwd)
    if (result.suggestion) return result
  }

  // 3. History completion
  const historyResult = getHistoryCompletion(trimmedInput, projectPath)
  if (historyResult.suggestion) return historyResult

  // 4. Basic command completion
  const commandResult = getCommandCompletion(trimmedInput)
  if (commandResult.suggestion) return commandResult

  // 5. Fallback: try path completion for last token
  const tokens = trimmedInput.split(/\s+/)
  const lastToken = tokens[tokens.length - 1]
  if (lastToken && tokens.length > 1) {
    const pathResult = getPathCompletion(lastToken, cwd)
    if (pathResult.suggestion) {
      const prefix = tokens.slice(0, -1).join(' ') + ' '
      return {
        suggestion: prefix + pathResult.suggestion,
        type: 'path',
        completion: pathResult.completion
      }
    }
  }

  return { suggestion: null, type: null, completion: '' }
}

function getPathCompletion(input: string, cwd: string): CompletionResult {
  try {
    // Extract the path part (last token after space)
    const tokens = input.split(/\s+/)
    const partialPath = tokens[tokens.length - 1]

    // Handle ~ expansion
    let expandedPath = partialPath
    if (expandedPath.startsWith('~')) {
      expandedPath = path.join(os.homedir(), expandedPath.slice(1))
    }

    // Resolve relative to cwd
    const basePath = path.dirname(expandedPath)
    const prefix = path.basename(expandedPath)
    const searchDir = path.isAbsolute(expandedPath)
      ? (basePath || '/')
      : path.resolve(cwd, basePath || '.')

    if (!fs.existsSync(searchDir)) {
      return { suggestion: null, type: null, completion: '' }
    }

    const entries = fs.readdirSync(searchDir, { withFileTypes: true })
    const matches = entries
      .filter(e => e.name.startsWith(prefix) && e.name !== prefix)
      .filter(e => !e.name.startsWith('.')) // Hide dotfiles
      .sort((a, b) => {
        // Directories first
        if (a.isDirectory() && !b.isDirectory()) return -1
        if (!a.isDirectory() && b.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

    if (matches.length === 0) {
      return { suggestion: null, type: null, completion: '' }
    }

    const match = matches[0]
    const completionPart = match.name.slice(prefix.length)
    const suffix = match.isDirectory() ? '/' : ''

    // Reconstruct the full suggestion
    const tokenPrefix = tokens.slice(0, -1).join(' ')
    const fullPath = path.join(basePath, match.name) + suffix
    const suggestion = tokenPrefix
      ? tokenPrefix + ' ' + (partialPath.startsWith('~') ? '~' + fullPath.slice(os.homedir().length) : fullPath)
      : (partialPath.startsWith('~') ? '~' + fullPath.slice(os.homedir().length) : fullPath)

    return {
      suggestion,
      type: 'path',
      completion: completionPart + suffix
    }
  } catch {
    return { suggestion: null, type: null, completion: '' }
  }
}

function getHistoryCompletion(input: string, projectPath: string): CompletionResult {
  try {
    const data = loadCommands()
    const projectCommands = data.entries
      .filter(e => e.projectPath === projectPath)
      .filter(e => e.command.startsWith(input) && e.command !== input)
      .sort((a, b) => {
        // Favorites first, then by count
        if (a.isFavorite && !b.isFavorite) return -1
        if (!a.isFavorite && b.isFavorite) return 1
        return b.count - a.count
      })

    if (projectCommands.length === 0) {
      return { suggestion: null, type: null, completion: '' }
    }

    const match = projectCommands[0]
    return {
      suggestion: match.command,
      type: 'history',
      completion: match.command.slice(input.length)
    }
  } catch {
    return { suggestion: null, type: null, completion: '' }
  }
}

function getGitCompletion(input: string, cwd: string): CompletionResult {
  const parts = input.split(/\s+/)

  // "git " -> suggest subcommands
  if (parts.length === 2) {
    const subcommandPrefix = parts[1]
    const matches = GIT_SUBCOMMANDS.filter(
      cmd => cmd.startsWith(subcommandPrefix) && cmd !== subcommandPrefix
    )

    if (matches.length > 0) {
      const match = matches[0]
      return {
        suggestion: `git ${match}`,
        type: 'git',
        completion: match.slice(subcommandPrefix.length)
      }
    }
  }

  // "git checkout/branch/switch/merge/rebase <partial>" -> suggest branches
  const branchCommands = ['checkout', 'branch', 'switch', 'merge', 'rebase']
  if (parts.length >= 3 && branchCommands.includes(parts[1])) {
    const branchPrefix = parts[parts.length - 1]
    const branches = getGitBranches(cwd)
    const matches = branches.filter(
      b => b.startsWith(branchPrefix) && b !== branchPrefix
    )

    if (matches.length > 0) {
      const match = matches[0]
      const prefix = parts.slice(0, -1).join(' ')
      return {
        suggestion: `${prefix} ${match}`,
        type: 'git',
        completion: match.slice(branchPrefix.length)
      }
    }
  }

  return { suggestion: null, type: null, completion: '' }
}

function getGitBranches(cwd: string): string[] {
  try {
    const output = execSync('git branch --format="%(refname:short)"', {
      cwd,
      encoding: 'utf-8',
      timeout: 2000,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return output.split('\n').filter(Boolean).map(b => b.trim())
  } catch {
    return []
  }
}

function getCommandCompletion(input: string): CompletionResult {
  // Only complete if it's the first word
  if (input.includes(' ')) {
    return { suggestion: null, type: null, completion: '' }
  }

  const matches = COMMON_COMMANDS.filter(
    cmd => cmd.startsWith(input) && cmd !== input
  )

  if (matches.length > 0) {
    const match = matches[0]
    return {
      suggestion: match,
      type: 'command',
      completion: match.slice(input.length)
    }
  }

  return { suggestion: null, type: null, completion: '' }
}
