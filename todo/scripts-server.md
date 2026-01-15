# スクリプト＆サーバー管理 要件定義

## 概要
package.jsonのscripts実行とサーバー管理を統合したコマンドパレット機能

---

## 機能要件

### FR-1: コマンドパレット表示
- [ ] `Cmd + K` でコマンドパレットを開く
- [ ] モーダル/オーバーレイ形式で中央に表示
- [ ] ESCキーまたは外側クリックで閉じる
- [ ] 検索/フィルター入力欄

### FR-2: Scripts検出・表示
- [ ] 選択中プロジェクトのpackage.jsonを自動読み込み
- [ ] scriptsセクションを一覧表示
- [ ] 各scriptの名前とコマンド内容を表示
- [ ] 検索でフィルタリング可能

### FR-3: Script実行
- [ ] script選択でワンクリック実行
- [ ] 現在フォーカスしているターミナルペインで実行
- [ ] 実行後にコマンドパレットを閉じる
- [ ] 実行コマンド: `npm run <script-name>` または `bun run <script-name>`

### FR-4: サーバー管理（特別扱い）
- [ ] サーバー系script（dev, start, serve, preview）を識別
- [ ] サーバー起動中は停止ボタンを表示
- [ ] 停止ボタンで `Ctrl+C` 相当のシグナル送信
- [ ] 起動状態をインジケーターで表示（緑点など）

### FR-5: パッケージマネージャー対応
- [ ] プロジェクトのパッケージマネージャーを自動検出
  - bun.lockb → bun
  - pnpm-lock.yaml → pnpm
  - yarn.lock → yarn
  - package-lock.json → npm
- [ ] 検出したマネージャーで実行

---

## 非機能要件

### NFR-1: UI/UX
- [ ] VSCode風のコマンドパレットデザイン
- [ ] キーボードナビゲーション（上下矢印、Enter）
- [ ] スムーズなアニメーション（フェードイン/アウト）

### NFR-2: パフォーマンス
- [ ] package.json読み込みは初回のみ（キャッシュ）
- [ ] プロジェクト切り替え時に再読み込み

---

## 技術設計

### 新規ファイル
| ファイル | 内容 |
|---------|------|
| `src/components/CommandPalette.tsx` | コマンドパレットUI |
| `src/stores/scriptsStore.ts` | scripts状態管理 |
| `electron/services/packageReader.ts` | package.json読み込み |

### 変更ファイル
| ファイル | 変更内容 |
|---------|---------|
| `electron/main.ts` | IPC追加 |
| `electron/preload.ts` | API追加 |
| `src/components/Layout.tsx` | CommandPalette配置 |
| `src/App.tsx` | グローバルキーイベント |

### IPC設計
```typescript
// 新規IPC
'scripts:read' → { scripts: Record<string, string>, packageManager: string }
'scripts:run' → void (scriptName, sessionId)
'server:stop' → void (sessionId)
```

### データ構造
```typescript
interface ScriptsState {
  scripts: Record<string, string>;  // { "dev": "vite", "build": "tsc && vite build" }
  packageManager: 'npm' | 'bun' | 'pnpm' | 'yarn';
  runningServers: Map<string, string>;  // scriptName → sessionId
}
```

---

## UI設計

```
┌─────────────────────────────────────────────┐
│  ┌───────────────────────────────────────┐  │
│  │ 🔍 Search scripts...                  │  │
│  ├───────────────────────────────────────┤  │
│  │ ● dev          vite          [Stop]   │  │
│  │   build        tsc && vite build      │  │
│  │   preview      vite preview           │  │
│  │   lint         eslint .               │  │
│  │   test         vitest                 │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
● = サーバー起動中
```

---

## サーバー系Script判定ロジック
```typescript
const SERVER_SCRIPTS = ['dev', 'start', 'serve', 'preview', 'watch'];

function isServerScript(name: string): boolean {
  return SERVER_SCRIPTS.some(s => name.includes(s));
}
```

---

## テスト項目
- [ ] Cmd+K でパレットが開くこと
- [ ] package.jsonのscriptsが表示されること
- [ ] script選択で実行されること
- [ ] サーバー起動中に停止ボタンが表示されること
- [ ] 停止ボタンでサーバーが停止すること
- [ ] 検索でフィルタリングできること
- [ ] ESCで閉じること

---

## 優先度
**高** - 開発効率向上の主要機能

## 依存関係
- なし（新規機能）
