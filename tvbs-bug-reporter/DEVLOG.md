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

### Code Review

在 push 前跑了一次自動化 code review，發現三個 Critical 問題：

1. **home/category YAML 結構不匹配** — placeholder 的 YAML 用了 `acceptance_criteria: []`，但 `flattenACs()` 預期 `sections[].acs[]` 結構。選 home 或 category 頁面時會直接 crash。修正：統一結構。

2. **ESM/CJS 混用** — root `package.json` 是 `"type": "module"`，但 Next.js 的 config 檔用 `module.exports`。修正：把 `next.config.js` 等改為 `.mjs` + `export default`。

3. **Web API route import 路徑脆弱** — 相對路徑在 webpack build 時可能失敗。修正：用 `import.meta.url` 定位絕對路徑 + `webpackIgnore` 註解。

另外也修了 ScreenshotUploader 的 `URL.createObjectURL` 記憶體洩漏（拆成 `FilePreview` 子元件管理生命週期），和 `.gitignore` 補上 `web/node_modules/`。

**心得**：Code review 抓到的 YAML 結構問題是真的會 crash 的 bug。如果沒有 review 就上線，使用者選到「首頁」就爆了。自動化 review 在這個階段很值得做。

### 通用化設計

把 `config.yaml` 裡的 hardcoded 值（workspace_id、status、AI model）改為可由環境變數覆蓋。設計邏輯：

- `.env` 定義敏感值和因團隊而異的設定
- `config.yaml` 定義結構和預設值
- `config-loader.js` 在載入 YAML 後用 `process.env` 覆蓋

這樣其他團隊 fork 後只需改 `.env` + 新增 `pages/*.yaml`，不需要動程式碼。也把 system prompt 裡的「TVBS」改成更通用的「網站改版專案」。

---

## Day 1 下半：Web Dashboard（2026-04-21）

### Phase 3 完成

用 Next.js 14 + Tailwind CSS 建了 Web Dashboard，功能包含：

**前端（app/）**
- 頁面類型選擇器（文章頁 / 影音頁 / 首頁 / 分類頁）
- 截圖拖放上傳（react-dropzone，支援多張）
- 問題描述輸入
- 環境 / 裝置 / 測試網址選擇
- Bug Report 即時預覽（含 AI 信心度、AC 比對、複製 Markdown）
- Loading skeleton animation

**後端（app/api/analyze/）**
- 接收 FormData（圖片 + 參數）
- 暫存圖片到 tmp 目錄
- 呼叫 core/analyzer.js 做 AI 分析
- 回傳結構化 JSON + Markdown
- 自動清理暫存檔

**技術決策**
- Web 有自己的 `package.json`，獨立安裝依賴
- API route 用 `dotenv` 手動載入上層 `.env`（因為 Next.js 預設只讀 `web/.env`）
- Config 檔用 `.mjs` 副檔名避免 ESM/CJS 衝突

### 三條路驗證

在 push 前對三條路做了完整驗證：

| 路徑 | 測試項目 | 結果 |
|---|---|---|
| CLI | 3 指令 --help、import 解析 mock test-results、validation 攔截 | ✅ 全通 |
| Core | 10 個函式載入 + 執行、4 個頁面 flattenACs | ✅ 全通 |
| Web | npm install + next build 編譯 + 靜態頁面產生 | ✅ 全通 |

### .env 設定

完成 API key 設定流程：
- Anthropic API Key — 從 console.anthropic.com 建立
- ClickUp API Token — 從 ClickUp Settings → Apps → Generate
- ClickUp Workspace ID — 從 URL 取得

**踩坑**：Anthropic Console 建立 key 後只顯示一次，關掉就無法再複製。需要重新建一把。

---

## 待續

- [ ] Anthropic API 加值後，端到端測試 AI 截圖分析
- [ ] 用真實 Playwright test-results 測 import → create 完整流程
- [ ] 整合進 Playwright CI pipeline
- [ ] Web Dashboard 部署（Vercel 或內部伺服器）
