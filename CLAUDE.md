# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development (runs all packages in parallel)
pnpm dev

# Desktop app only
pnpm dev:desktop

# Build all packages
pnpm build

# Build desktop app (includes electron-builder)
pnpm build:desktop

# Type checking
pnpm typecheck

# Lint all packages
pnpm lint

# Clean build artifacts
pnpm clean
```

**Note:** When using Git worktree, run `pnpm install` before lint/build.

## Architecture Overview

Claudeck is a terminal application for managing multiple Claude Code sessions. Built as an Electron app with React frontend and node-pty for terminal emulation.

### Monorepo Structure

- `apps/desktop` - Main Electron desktop application
- `apps/lp` - Landing page
- `packages/shared` - Shared utilities and theme definitions

### Desktop App Architecture (apps/desktop)

**Electron Main Process (`electron/`):**
- `main.ts` - App entry point, window management, IPC handlers, global shortcuts (Cmd+. for dropdown)
- `dropdownWindow.ts` - Quick-access dropdown terminal (Quake-style)
- `preload.ts` - Context bridge exposing APIs to renderer
- `services/`:
  - `ptyManager.ts` - PTY session lifecycle, shell spawning, OSC escape sequence parsing (cwd via OSC 7, git branch via OSC 9999)
  - `claudeStateDetector.ts` - Detects Claude Code running state (idle/processing/waiting-input)
  - `hooksServer.ts` - HTTP server (port 52429) receiving Claude Code hook events
  - `hooksConfigManager.ts` - Manages Claude Code hooks configuration
  - `completionService.ts` - Ghost text completion suggestions
  - `settingsStorage.ts` - Persists user settings
  - `projectScanner.ts` - Discovers Claude Code projects
  - `commandStorage.ts` - Command history and favorites

**React Renderer (`src/`):**
- State Management (Zustand stores in `stores/`):
  - `sessionStore.ts` - Terminal session state (sessions, active session, minimized)
  - `projectStore.ts` - Project list and selection
  - `themeStore.ts` - Theme preferences
  - `claudeStateStore.ts` - Per-session Claude state tracking
  - `sidebarStore.ts`, `scriptsStore.ts`, `commandStore.ts` - UI state
- Key Components (`components/`):
  - `Layout.tsx` - Main app layout with sidebar and terminal panes
  - `XtermWrapper.tsx` - xterm.js terminal integration
  - `InputPopover.tsx` - Quick input with ghost completion
  - `Sidebar.tsx` - Project navigation
  - `DropdownTerminal.tsx` - Dropdown terminal UI

### IPC Communication Pattern

Main process exposes handlers via `ipcMain.handle()` / `ipcMain.on()`:
- `session:*` - PTY operations (create, destroy, write, resize)
- `projects:*` - Project scanning
- `dropdown:*` - Dropdown terminal operations
- `settings:*` - Settings persistence
- `hooks:*` - Claude hooks management

Renderer accesses via `window.api.*` (defined in preload.ts).

### Claude Code Integration

1. **State Detection** - Parses terminal output for Claude prompts, uses hooks events
2. **Hooks Server** - Receives POST requests from Claude Code hooks at `/hook` endpoint
3. **Visual Indicators** - Shows Claude state (idle/processing/waiting) in session headers

### Key Keyboard Shortcuts

- `Cmd+.` - Toggle dropdown terminal (global)
- `Cmd+K` - Command palette
- `Cmd+H` - Command history
- `Cmd+B` - Toggle sidebar
- `Tab` - Cycle panes

### Theme System

Themes defined in `packages/shared/src/themes/`:
- `types.ts` - Theme interface with terminal colors, UI colors
- `presets/` - Built-in themes (dark, claude, slack, notion)
