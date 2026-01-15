import fs from 'fs'
import path from 'path'

export type PackageManager = 'npm' | 'bun' | 'pnpm' | 'yarn'

export interface ScriptsInfo {
  scripts: Record<string, string>
  packageManager: PackageManager
}

// Lock file patterns in priority order
const LOCK_FILE_PATTERNS: Array<{ file: string; manager: PackageManager }> = [
  { file: 'bun.lockb', manager: 'bun' },
  { file: 'bun.lock', manager: 'bun' },
  { file: 'pnpm-lock.yaml', manager: 'pnpm' },
  { file: 'yarn.lock', manager: 'yarn' },
  { file: 'package-lock.json', manager: 'npm' },
]

function detectPackageManager(projectPath: string): PackageManager {
  for (const { file, manager } of LOCK_FILE_PATTERNS) {
    if (fs.existsSync(path.join(projectPath, file))) {
      return manager
    }
  }
  return 'npm' // Default fallback
}

export function readPackageScripts(projectPath: string): ScriptsInfo {
  const packageJsonPath = path.join(projectPath, 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    return {
      scripts: {},
      packageManager: detectPackageManager(projectPath),
    }
  }

  try {
    const content = fs.readFileSync(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content)
    const scripts = packageJson.scripts || {}
    const packageManager = detectPackageManager(projectPath)

    return { scripts, packageManager }
  } catch (error) {
    console.error('Failed to read package.json:', error)
    return {
      scripts: {},
      packageManager: 'npm',
    }
  }
}
