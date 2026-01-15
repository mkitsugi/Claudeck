/**
 * Claude Code状態検知ユーティリティ
 *
 * ハイブリッドアプローチ:
 * 1. OSC 633/133 シーケンス検知（VSCode Shell Integration）
 * 2. プロンプトパターン検知（❯ や > など）
 * 3. タイムアウトベースのフォールバック
 */

export type ClaudeCodeStatus = 'idle' | 'processing' | 'waiting-input'

export interface ClaudeCodeState {
  status: ClaudeCodeStatus
  lastActivity: number
}

export type StateChangeCallback = (state: ClaudeCodeState) => void

// OSC シーケンスパターン
const OSC_PATTERNS = {
  // VSCode Shell Integration (OSC 633)
  PROMPT_END_633: /\x1b\]633;B/,     // 入力待ち開始
  PRE_EXEC_633: /\x1b\]633;C/,       // 実行開始
  EXEC_DONE_633: /\x1b\]633;D/,      // 実行完了

  // FinalTerm互換 (OSC 133)
  PROMPT_END_133: /\x1b\]133;B/,
  PRE_EXEC_133: /\x1b\]133;C/,
  EXEC_DONE_133: /\x1b\]133;D/,
}

// プロンプトパターン（Claude Code特有）
const PROMPT_PATTERNS = [
  /❯\s*$/,           // Claude Code標準プロンプト
  />\s*$/,           // 簡易プロンプト
  /\$\s*$/,          // シェルプロンプト
  /%\s*$/,           // zshプロンプト
  /#\s*$/,           // rootプロンプト
]

// ANSIエスケープシーケンスを除去
function stripAnsi(str: string): string {
  return str
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')  // CSI sequences
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')  // OSC sequences
    .replace(/\x1b[PX^_][^\x1b]*\x1b\\/g, '')  // DCS, SOS, PM, APC
    .replace(/\x1b[\[\]()#;?]*[0-9;]*[a-zA-Z]/g, '')  // Other escapes
}

export class ClaudeCodeDetector {
  private state: ClaudeCodeState = {
    status: 'idle',
    lastActivity: Date.now()
  }
  private buffer = ''
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private callbacks: Set<StateChangeCallback> = new Set()

  // タイムアウト設定（ミリ秒）
  private readonly IDLE_THRESHOLD = 800
  private readonly BUFFER_MAX_LENGTH = 2000

  constructor() {
    this.state = { status: 'idle', lastActivity: Date.now() }
  }

  /**
   * ターミナル出力データを処理
   */
  onData(data: string): void {
    this.state.lastActivity = Date.now()

    // バッファに追加（サイズ制限）
    this.buffer += data
    if (this.buffer.length > this.BUFFER_MAX_LENGTH) {
      this.buffer = this.buffer.slice(-this.BUFFER_MAX_LENGTH)
    }

    // 1. OSC 633/133 シーケンス検知（最優先）
    if (this.checkOscSequences(data)) {
      return
    }

    // 2. プロンプトパターン検知
    if (this.checkPromptPatterns()) {
      return
    }

    // 3. タイムアウトフォールバック
    this.resetIdleTimer()
  }

  /**
   * OSCシーケンスをチェック
   */
  private checkOscSequences(data: string): boolean {
    // 入力待ち開始（プロンプト表示完了）
    if (OSC_PATTERNS.PROMPT_END_633.test(data) ||
        OSC_PATTERNS.PROMPT_END_133.test(data)) {
      this.setState('waiting-input')
      this.clearBuffer()
      return true
    }

    // 実行開始
    if (OSC_PATTERNS.PRE_EXEC_633.test(data) ||
        OSC_PATTERNS.PRE_EXEC_133.test(data)) {
      this.setState('processing')
      this.clearBuffer()
      return true
    }

    // 実行完了
    if (OSC_PATTERNS.EXEC_DONE_633.test(data) ||
        OSC_PATTERNS.EXEC_DONE_133.test(data)) {
      // 実行完了後は通常プロンプトが表示されるので、
      // waiting-inputに遷移
      this.setState('waiting-input')
      this.clearBuffer()
      return true
    }

    return false
  }

  /**
   * プロンプトパターンをチェック
   */
  private checkPromptPatterns(): boolean {
    const cleanText = stripAnsi(this.buffer)
    const lines = cleanText.split('\n')
    const lastLine = lines[lines.length - 1] || ''

    // プロンプトパターンにマッチするか確認
    const hasPrompt = PROMPT_PATTERNS.some(pattern => pattern.test(lastLine))

    if (hasPrompt) {
      this.setState('waiting-input')
      this.clearBuffer()
      return true
    }

    return false
  }

  /**
   * アイドルタイマーをリセット
   */
  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }

    // 出力があった場合は処理中とみなす
    if (this.state.status !== 'processing') {
      this.setState('processing')
    }

    this.idleTimer = setTimeout(() => {
      // タイムアウト後、処理中なら入力待ちに遷移
      if (this.state.status === 'processing') {
        this.setState('waiting-input')
      }
    }, this.IDLE_THRESHOLD)
  }

  /**
   * バッファをクリア
   */
  private clearBuffer(): void {
    this.buffer = ''
  }

  /**
   * 状態を更新
   */
  private setState(status: ClaudeCodeStatus): void {
    if (this.state.status !== status) {
      this.state = {
        status,
        lastActivity: Date.now(),
      }
      this.notifyCallbacks()
    }
  }

  /**
   * コールバックを通知
   */
  private notifyCallbacks(): void {
    for (const callback of this.callbacks) {
      callback({ ...this.state })
    }
  }

  /**
   * 状態変更リスナーを登録
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.callbacks.add(callback)
    // 現在の状態を即座に通知
    callback({ ...this.state })

    return () => {
      this.callbacks.delete(callback)
    }
  }

  /**
   * 現在の状態を取得
   */
  getState(): ClaudeCodeState {
    return { ...this.state }
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    this.callbacks.clear()
    this.buffer = ''
  }
}
