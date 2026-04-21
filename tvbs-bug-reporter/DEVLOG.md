# TVBS Bug Reporter — 開發日誌

> 從一次 Cowork 對話到一個完整工具的旅程。
> 這份日誌記錄整個開發過程，供日後寫文章分享。

---

## Day 0：起點（2026-04-20）

### 背景

我是 TVBS 新聞網改版專案的 PM。每次測試發現 bug，都要手動在 ClickUp 建 subtask：寫標題、填環境、描述重現步驟、貼截圖、設狀態。一張單大概要花 5-10 分鐘。改版專案有上百條 AC，bug 量不小，這件事佔掉不少時間。

### 第一次嘗試：在 Cowork 裡直接建單

我直接在 Claude Cowork 對話中，把 Bug Report 的 SOP 給 Claude，讓它幫我建 ClickUp subtask。流程：

1. 我提供父卡片 ID（如 NS-2030）
2. 描述問題 + 上傳截圖
3. Claude 產出 Bug Report 內容
4. 我確認後，Claude 用 ClickUp MCP 建單

**結果**：可以用！但遇到幾個問題：
- ClickUp 狀態名稱要完全一致（試了 "need fix"、"Need Fix"、"NEED FIX"，最後發現是 "NEEDS FIX"）
- 截圖無法透過 API 上傳（Cowork 對話中的圖片不是檔案，無法附加到 ClickUp）
- 每次新 session 都要重新貼 SOP 規則

### 決策：做成工具

既然 SOP 是固定的，為什麼不把它結構化？我決定做一個獨立工具，把規則寫在設定檔裡，讓任何人都能用。

### 方向選擇

討論了三個方向：
- **A. CLI only** — 搭配 Playwright CI，自動從測試結果建單
- **B. Cowork Skill only** — 保持對話式，但規則外部化
- **C. 三合一（CLI + Skill + Web Dashboard）** — 野心最大，但覆蓋所有使用場景

選了 **方向 C**。理由：CLI 跟 Playwright 整合最自然，Skill 給 PM 日常用，Web Dashboard 讓非技術人員也能操作。三者共用同一套 core 模組和設定檔。

### 架構設計

核心思路：**設定與邏輯分離**。

- `config/config.yaml` — 控制行為（ClickUp 設定、命名規則、AI model）
- `config/pages/*.yaml` — 各頁面的 AC 定義（從 ClickUp 卡片描述中提取）
- `config/templates/bug-report.md` — Handlebars 模板控制輸出格式
- `core/` — 5 個核心模組，三種入口共用

這樣設計的好處：PM 想改 Bug Report 的格式？改 template。新頁面上線了？加一個 YAML。不需要動程式碼。

---

## Day 1：開發（2026-04-21）

### Phase 1 完成

用 Claude Cowork 一個 session 完成了整個 Phase 1：

**設定檔（config/）**
- `config.yaml` — 主設定，包含 ClickUp workspace ID、預設狀態 NEEDS FIX、命名 pattern `[{page}] - {summary}`
- `pages/article.yaml` — 文章頁 AC，從 NS-2030 提取的 30+ 條 AC（Header、Breadcrumb、標題、時間、作者、分享、Featured Image、文章內容區、SEO 等）
- `pages/video.yaml` — 影音頁 AC，從 NS-2263 提取（路由、Hub Hero Live、VOD Playlist、播放器等）
- `templates/bug-report.md` — Handlebars 模板，包含環境、重現步驟、預期/實際結果、附件區塊

**核心模組（core/）**
- `config-loader.js` — YAML + MD 載入器，帶 cache
- `analyzer.js` — Claude API 多模態分析（送截圖 + AC 清單，回傳結構化 JSON）
- `clickup-client.js` — ClickUp REST API 封裝（getTask、createTask、updateTask、attachFile、batch）
- `report-generator.js` — Handlebars template engine（generateTitle、generateReport、generateClickUpPayload）
- `playwright-parser.js` — test-results/ 目錄掃描（解析失敗案例、截圖、error-context、trace.zip）

**CLI（cli/）**
- `analyze` — 上傳截圖 → AI 分析 → 產出 Bug Report
- `import` — 讀取 Playwright test-results → 解析失敗案例
- `create` — 讀取 JSON → 逐一建立 ClickUp Subtask

**其他**
- `skill/SKILL.md` — Cowork Skill 流程定義
- `README.md` — 使用說明
- npm install 通過（82 packages, 0 vulnerabilities）

### GitHub

推上 `camadalobster-source/tools` monorepo 的 `tvbs-bug-reporter/` 子目錄。

過程中遇到的小波折：
- `gh` CLI 需要先 `gh auth login`（選 HTTPS + web browser auth）
- tools repo 已存在且有其他檔案（index.html, native-ad-customizer.html），所以改為 clone → 加子目錄 → push
- sandbox 的 git index.lock 殘留，需手動刪除

### 效率觀察

從 Cowork 對話開始到 Phase 1 完成 + 推上 GitHub，大約在 2 個 session 內完成。如果純手動開發，預估需要 2-3 天。加速的關鍵在於：
1. 設定檔（YAML/MD）的結構是在對話中逐步確定的，Claude 即時產出
2. Core 模組有清楚的介面定義，可以平行產出
3. 從「手動做一次」到「工具化」的轉變是自然的——因為 SOP 已經在對話中成形了

---

## 待續

- [ ] Phase 3: Web Dashboard（Next.js）
- [ ] 端到端測試：用真實截圖跑一次 analyze → create 完整流程
- [ ] 整合進 Playwright CI pipeline
