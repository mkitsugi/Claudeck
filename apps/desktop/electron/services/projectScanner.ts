import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

export interface Project {
  id: string
  name: string
  path: string
  type: 'claude-dir' | 'claude-md'
  isWorktree: boolean
  parentProject?: string
  branch?: string
  lastModified: number
}

interface Worktree {
  path: string
  branch?: string
  isMain: boolean
}

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.cache',
  'Library',
  'Applications',
  '.Trash',
  '.npm',
  '.pnpm',
  '.yarn',
  '.vscode',
  '.idea',
  'vendor',
  '__pycache__',
  '.next',
  '.nuxt',
  'coverage',
  '.turbo',
])

const MAX_DEPTH = 5

function generateId(projectPath: string): string {
  return Buffer.from(projectPath).toString('base64').replace(/[/+=]/g, '_')
}

function detectWorktrees(gitDir: string): Worktree[] {
  try {
    const output = execSync('git worktree list --porcelain', {
      cwd: gitDir,
      encoding: 'utf-8',
      timeout: 5000,
    })

    const worktrees: Worktree[] = []
    let currentWorktree: Partial<Worktree> = {}

    for (const line of output.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (currentWorktree.path) {
          worktrees.push(currentWorktree as Worktree)
        }
        currentWorktree = { path: line.substring(9), isMain: false }
      } else if (line.startsWith('branch ')) {
        currentWorktree.branch = line.substring(7).replace('refs/heads/', '')
      } else if (line === 'bare') {
        currentWorktree.isMain = true
      }
    }

    if (currentWorktree.path) {
      worktrees.push(currentWorktree as Worktree)
    }

    // First worktree is typically the main one
    if (worktrees.length > 0) {
      worktrees[0].isMain = true
    }

    return worktrees
  } catch {
    return []
  }
}

function scanDirectory(
  dirPath: string,
  depth: number,
  projects: Map<string, Project>
): void {
  if (depth > MAX_DEPTH) return

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    // Check for .claude directory
    const hasClaudeDir = entries.some(
      (e) => e.isDirectory() && e.name === '.claude'
    )

    // Check for CLAUDE.md file
    const hasClaudeMd = entries.some(
      (e) => e.isFile() && e.name === 'CLAUDE.md'
    )

    if (hasClaudeDir || hasClaudeMd) {
      const id = generateId(dirPath)
      const name = path.basename(dirPath)

      // Check for git worktrees
      const hasGit = entries.some((e) => e.isDirectory() && e.name === '.git')
      let worktrees: Worktree[] = []

      if (hasGit) {
        worktrees = detectWorktrees(dirPath)
      }

      // Get last modified time - use git last commit time if available
      let lastModified = 0
      try {
        if (hasGit) {
          // Use git log to get last commit timestamp (most accurate)
          const gitTimestamp = execSync('git log -1 --format=%ct 2>/dev/null || echo 0', {
            cwd: dirPath,
            encoding: 'utf-8',
            timeout: 3000,
          }).trim()
          lastModified = parseInt(gitTimestamp, 10) * 1000 // Convert to ms
        }
        // Fallback to directory mtime
        if (lastModified === 0) {
          const stat = fs.statSync(dirPath)
          lastModified = stat.mtimeMs
        }
      } catch {}

      // Add main project
      if (!projects.has(id)) {
        projects.set(id, {
          id,
          name,
          path: dirPath,
          type: hasClaudeDir ? 'claude-dir' : 'claude-md',
          isWorktree: false,
          lastModified,
        })
      }

      // Add worktrees as separate projects
      for (const wt of worktrees) {
        if (!wt.isMain && wt.path !== dirPath) {
          const wtId = generateId(wt.path)
          let wtLastModified = 0
          try {
            const wtStat = fs.statSync(wt.path)
            wtLastModified = wtStat.mtimeMs
          } catch {}

          if (!projects.has(wtId)) {
            projects.set(wtId, {
              id: wtId,
              name: `${name} (${wt.branch || 'worktree'})`,
              path: wt.path,
              type: hasClaudeDir ? 'claude-dir' : 'claude-md',
              isWorktree: true,
              parentProject: id,
              branch: wt.branch,
              lastModified: wtLastModified,
            })
          }
        }
      }
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (EXCLUDE_DIRS.has(entry.name)) continue
      if (entry.name.startsWith('.') && entry.name !== '.claude') continue

      const subPath = path.join(dirPath, entry.name)
      scanDirectory(subPath, depth + 1, projects)
    }
  } catch {
    // Skip directories we can't read
  }
}

let cachedProjects: Project[] | null = null

export function scanProjects(forceRefresh = false): Project[] {
  if (cachedProjects && !forceRefresh) {
    return cachedProjects
  }

  const projects = new Map<string, Project>()
  const homeDir = os.homedir()

  scanDirectory(homeDir, 0, projects)

  // Sort by lastModified descending (newest first)
  cachedProjects = Array.from(projects.values()).sort((a, b) =>
    b.lastModified - a.lastModified
  )

  return cachedProjects
}

export function refreshProjects(): Project[] {
  return scanProjects(true)
}
