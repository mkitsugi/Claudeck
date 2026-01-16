// Hooks Server - Receives events from Claude Code hooks
import http from 'http'
import type { ClaudeState } from './claudeStateDetector'

export interface HookEvent {
  hook_event_name: string
  session_id: string
  cwd?: string
  tool_name?: string
  tool_input?: Record<string, unknown>
  tool_response?: Record<string, unknown>
}

type HookEventCallback = (event: HookEvent) => void

const HOOKS_PORT = 52429

class HooksServer {
  private server: http.Server | null = null
  private callbacks: Set<HookEventCallback> = new Set()
  private isRunning = false

  start(): Promise<void> {
    if (this.isRunning) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // CORS headers for local requests
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.writeHead(200)
          res.end()
          return
        }

        if (req.method === 'POST' && req.url === '/hook') {
          let body = ''
          req.on('data', chunk => {
            body += chunk.toString()
          })
          req.on('end', () => {
            try {
              const event = JSON.parse(body) as HookEvent
              console.log(`[HooksServer] Received: ${event.hook_event_name}`, event.cwd ? `cwd=${event.cwd}` : '')
              this.notifyCallbacks(event)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true }))
            } catch (e) {
              console.error('[HooksServer] Failed to parse hook event:', e)
              res.writeHead(400)
              res.end('Invalid JSON')
            }
          })
        } else {
          res.writeHead(404)
          res.end('Not Found')
        }
      })

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[HooksServer] Port ${HOOKS_PORT} already in use, trying to continue...`)
          // Port already in use - another Claudeck instance might be running
          this.isRunning = true
          resolve()
        } else {
          reject(err)
        }
      })

      this.server.listen(HOOKS_PORT, '127.0.0.1', () => {
        console.log(`[HooksServer] Listening on http://127.0.0.1:${HOOKS_PORT}`)
        this.isRunning = true
        resolve()
      })
    })
  }

  stop(): void {
    if (this.server) {
      this.server.close()
      this.server = null
      this.isRunning = false
      console.log('[HooksServer] Stopped')
    }
  }

  onHookEvent(callback: HookEventCallback): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  private notifyCallbacks(event: HookEvent): void {
    for (const callback of this.callbacks) {
      try {
        callback(event)
      } catch (e) {
        console.error('[HooksServer] Callback error:', e)
      }
    }
  }

  getPort(): number {
    return HOOKS_PORT
  }

  isActive(): boolean {
    return this.isRunning
  }
}

export const hooksServer = new HooksServer()

// Helper: Map hook events to Claude state
export function hookEventToState(event: HookEvent): ClaudeState | null {
  switch (event.hook_event_name) {
    case 'UserPromptSubmit':
      return 'processing'
    case 'PreToolUse':
      return 'processing'
    case 'PostToolUse':
      // Check if this is a tool that waits for user input
      if (event.tool_name === 'AskUserQuestion') {
        return 'waiting-input'
      }
      // ExitPlanMode waits for user approval
      if (event.tool_name === 'ExitPlanMode') {
        return 'waiting-input'
      }
      return 'processing'
    case 'PermissionRequest':
      // Permission request always waits for user input
      return 'waiting-input'
    case 'Stop':
    case 'SubagentStop':
      return 'idle'
    default:
      return null
  }
}
