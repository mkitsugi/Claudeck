# サイドバーでパス階層に基づく親子関係を表現する

## 概要
現在worktreeのみ表現されている親子関係を、パス階層（サブディレクトリ）にも拡張する。
無制限のツリー構造に対応し、worktreeとパス階層をアイコンで視覚的に区別する。

## 変更ファイル

### 1. `apps/desktop/electron/services/projectScanner.ts`

**Projectインターフェースに追加:**
```typescript
parentType?: 'worktree' | 'path'  // 親子関係の種類
```

**パス階層解析関数を追加:**
```typescript
function resolvePathHierarchy(projects: Map<string, Project>): void {
  const projectList = Array.from(projects.values())

  // パスの浅い順にソート
  projectList.sort((a, b) =>
    a.path.split(path.sep).length - b.path.split(path.sep).length
  )

  for (const project of projectList) {
    // worktreeで既に親が設定されている場合
    if (project.parentProject && project.isWorktree) {
      project.parentType = 'worktree'
      continue
    }

    // パス階層から最も近い親を探す
    let closestParent: Project | null = null
    let closestDepth = 0

    for (const candidate of projectList) {
      if (candidate.id === project.id) continue
      // 自分のパスがcandidateのパス配下にあるかチェック
      if (project.path.startsWith(candidate.path + path.sep)) {
        const depth = candidate.path.split(path.sep).length
        if (depth > closestDepth) {
          closestParent = candidate
          closestDepth = depth
        }
      }
    }

    if (closestParent) {
      project.parentProject = closestParent.id
      project.parentType = 'path'
    }
  }
}
```

**scanProjects関数の末尾で呼び出し:**
```typescript
export function scanProjects(forceRefresh = false): Project[] {
  // ... 既存のスキャン処理 ...

  // 親子関係を解析（新規追加）
  resolvePathHierarchy(projects)

  // ソートして返す（既存）
  cachedProjects = Array.from(projects.values()).sort(...)
  return cachedProjects
}
```

### 2. `apps/desktop/src/types/index.ts`

**Projectインターフェースに追加:**
```typescript
export interface Project {
  // ... 既存フィールド
  parentType?: 'worktree' | 'path'  // 新規追加
}
```

### 3. `apps/desktop/src/components/Sidebar.tsx`

**再帰的なツリー構造に変更:**

```typescript
interface ProjectTreeNode {
  project: Project
  children: ProjectTreeNode[]
}

// ツリー構築関数
function buildTree(projects: Project[]): ProjectTreeNode[] {
  const childMap = new Map<string | undefined, Project[]>()

  projects.forEach(p => {
    const siblings = childMap.get(p.parentProject) || []
    siblings.push(p)
    childMap.set(p.parentProject, siblings)
  })

  function buildNode(project: Project): ProjectTreeNode {
    const children = (childMap.get(project.id) || [])
      .sort((a, b) => a.name.localeCompare(b.name))
    return {
      project,
      children: children.map(buildNode)
    }
  }

  // ルートノード（親がないプロジェクト）
  const roots = (childMap.get(undefined) || [])
    .sort((a, b) => a.name.localeCompare(b.name))
  return roots.map(buildNode)
}
```

**再帰的レンダリングコンポーネント:**
```tsx
function ProjectTreeItem({ node, depth }: { node: ProjectTreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(false)
  // ... レンダリング（depthに応じたインデント）
}
```

### 4. `apps/desktop/src/components/ProjectItem.tsx`

**アイコンで区別:**
```tsx
{project.parentType === 'worktree' && project.branch && (
  <span className="project-branch">
    <GitBranch size={10} />
    {project.branch}
  </span>
)}
{project.parentType === 'path' && (
  <span className="project-subdir">
    <FolderTree size={10} />  {/* lucide-reactのFolderTreeアイコン */}
  </span>
)}
```

## 実装順序

1. **型定義更新** - `types/index.ts`に`parentType`追加
2. **スキャナー更新** - `projectScanner.ts`に`parentType`追加 + `resolvePathHierarchy`実装
3. **Sidebar更新** - ツリー構造の構築・レンダリングに変更
4. **ProjectItem更新** - `parentType`に応じたアイコン表示
5. **スタイル調整** - 必要に応じてCSSでインデント・見た目調整

## 動作確認

1. `pnpm dev:desktop` でアプリ起動
2. サイドバーでネストされたプロジェクトが階層表示されることを確認
3. worktreeプロジェクトはブランチアイコン、パス階層プロジェクトはフォルダツリーアイコンで表示されることを確認
4. 展開/折りたたみが正しく動作することを確認
5. お気に入り機能が引き続き動作することを確認
