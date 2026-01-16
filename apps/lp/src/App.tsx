function App() {
  return (
    <div className="app">
      <header className="hero">
        <h1>Claudeck</h1>
        <p className="tagline">Terminal for Claude Code</p>
        <p className="description">
          Claude Codeプロジェクト向けの美しいターミナルアプリケーション
        </p>
        <div className="cta">
          <a href="https://github.com/mkitsugi/Claudeck/releases" className="button primary">
            ダウンロード
          </a>
          <a href="https://github.com/mkitsugi/Claudeck" className="button secondary">
            GitHub
          </a>
        </div>
      </header>

      <section className="features">
        <h2>Features</h2>
        <div className="feature-grid">
          <div className="feature">
            <h3>Claude Code対応</h3>
            <p>Claude Codeプロジェクトとシームレスに連携</p>
          </div>
          <div className="feature">
            <h3>カスタムテーマ</h3>
            <p>ダーク、ライト、カスタムテーマに対応</p>
          </div>
          <div className="feature">
            <h3>高速起動</h3>
            <p>Electronベースで快適な動作</p>
          </div>
          <div className="feature">
            <h3>ドロップダウンモード</h3>
            <p>ショートカットで素早くアクセス</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; 2024 Claudeck. MIT License.</p>
      </footer>
    </div>
  )
}

export default App
