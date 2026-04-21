# TVBS Bug Reporter — 架構文件

## 概覽

AI 驅動的 Bug 回報工具，專為網站改版專案設計。三種入口（CLI / Cowork Skill / Web Dashboard）共用同一套 core 模組和 config 設定。

```
使用者
  │
  ├─ CLI ──────────┐
  ├─ Cowork Skill ─┤──→ core/ ──→ ClickUp API
  └─ Web Dashboard ┘       │
                          config/
```

## 目錄結構

```
tvbs-bug-reporter/
├── config/                          # 設定層（YAML + Handlebars）
│   ├── config.yaml                  #   主設定：ClickUp、命名規則、AI model
│   ├── pages/                       #   各頁面的 AC 驗收標準
│   │   ├── article.yaml             #     文章頁（NS-2030, 23 ACs）
│   │   ├── video.yaml               #     影音頁（NS-2263, 22 ACs）
│   │   ├── home.yaml                #     首頁（placeholder）
│   │   └── category.yaml            #     分類頁（placeholder）
│   └── templates/
│       └── bug-report.md            #   Handlebars 報告模板
│
├── core/                            # 核心邏輯層（三入口共用）
│   ├── config-loader.js             #   YAML/模板載入 + env 覆蓋 + cache
│   ├── analyzer.js                  #   Claude API 多模態截圖分析
│   ├── clickup-client.js            #   ClickUp REST API 封裝
│   ├── report-generator.js          #   Handlebars 模板引擎
│   ├── playwright-parser.js         #   Playwright test-results 解析
│   └── index.js                     #   Barrel export
│
├── cli/                             # 入口 1：CLI（Commander.js）
│   ├── index.js                     #   主程式 + 指令註冊
│   └── commands/
│       ├── analyze.js               #   截圖 → AI 分析 → Bug Report
│       ├── import.js                #   test-results → 解析失敗案例
│       └── create.js                #   JSON → ClickUp Subtask
│
├── skill/                           # 入口 2：Cowork Skill
│   └── SKILL.md                     #   對話式流程定義
│
├── web/                             # 入口 3：Web Dashboard（Next.js 14）
│   ├── app/
│   │   ├── layout.js                #   Root layout
│   │   ├── page.js                  #   主頁面（截圖上傳 + 報告預覽）
│   │   ├── globals.css              #   Tailwind base
│   │   └── api/analyze/route.js     #   POST /api/analyze
│   ├── components/
│   │   ├── ScreenshotUploader.js    #   拖放上傳元件
│   │   ├── PageSelector.js          #   頁面類型選擇
│   │   └── BugReportPreview.js      #   報告預覽 + 複製
│   ├── package.json                 #   Web 獨立依賴
│   ├── next.config.mjs
│   ├── tailwind.config.mjs
│   └── postcss.config.mjs
│
├── .env                             # 環境變數（不進 git）
├── .env.example                     # 環境變數範本
├── .gitignore
├── package.json                     # Root 依賴（core + CLI 用）
├── README.md
├── ARCHITECTURE.md                  # ← 你正在看的這份
└── DEVLOG.md                        # 開發日誌（寫文章用）
```

## 核心模組

### config-loader.js

負責載入所有設定，提供 cache 和環境變數覆蓋機制。

```
loadConfig()         → config.yaml（+ env 覆蓋）
loadTemplate()       → bug-report.md（Handlebars 模板字串）
loadPageACs(key)     → pages/{key}.yaml（原始 YAML 物件）
getAvailablePages()  → [{ key, displayName }]
flattenACs(key)      → [{ id, title, expected, section }]（攤平的 AC 陣列）
clearCache()         → 清除所有快取（測試用）
```

**環境變數覆蓋順序**：`process.env` > `config.yaml` 預設值

| 環境變數 | 覆蓋目標 |
|---|---|
| `CLICKUP_WORKSPACE_ID` | `clickup.workspace_id` |
| `CLICKUP_DEFAULT_STATUS` | `clickup.default_status` |
| `AI_MODEL` | `ai.model` |

### analyzer.js

接收截圖路徑 + 頁面 key，呼叫 Claude API 做多模態分析。

```
analyzeScreenshots({
  imagePaths,        // string[] — 截圖檔案路徑
  pageKey,           // string — 頁面 key
  userDescription,   // string — 使用者描述（選填）
  env,               // string — 環境
  device,            // string — 裝置
  testUrl,           // string — 測試連結（選填）
}) → {
  title, summary, page, env, device,
  matched_ac, steps, expected, actual,
  attachments, confidence, raw_response
}
```

流程：圖片 base64 編碼 → 組合 AC 清單 + 分析指令 → Claude API → 解析 JSON 回應

### clickup-client.js

ClickUp REST API 的輕量封裝。

```
createClickUpClient(token) → {
  getTask(taskId)                           → Task 物件
  createTask(listId, payload)               → 新建的 Task
  updateTask(taskId, updates)               → 更新後的 Task
  attachFile(taskId, filePath)              → 附件結果
  createBatchSubtasks(listId, payloads)     → 批次建立（含 600ms rate limit）
}
```

### report-generator.js

Handlebars 模板引擎，將結構化資料轉為 Markdown。

```
generateTitle(data)                         → "[文章頁] - 問題摘要"
generateReport(bugData)                     → Markdown 字串
generateClickUpPayload(bugData, parent, list) → ClickUp API 參數
generateBatchReports(bugs)                  → [{ title, markdown }]
```

### playwright-parser.js

解析 Playwright 的 `test-results/` 輸出目錄。

```
parseTestResults(path) → [{
  dirName, path, acId, description, platform,
  screenshots, errorContext, traceFile, source
}]

parseBugMarkdown(mdPath) → [{
  rawTitle, acId, sections: { ... }
}]

summarize(failures) → { total, byPlatform, byAC }
```

目錄命名解析規則：
- `video-system-AC-10.1-playlist-error-chromium` → AC ID: `AC-10.1`, platform: `unknown`
- `...-tvbs-mobile` → platform: `mobile`
- `...-tvbs-desktop` → platform: `desktop`
- 截圖檔名需符合 `test-failed*.png` 格式

## 資料流

### CLI: analyze → create

```
截圖.png
  → analyzer.js（Claude API）
  → { title, steps, expected, actual, ... }
  → report-generator.js（Handlebars）
  → Markdown + ClickUp payload
  → clickup-client.js（REST API）
  → ClickUp Subtask 建立完成
```

### CLI: import → create

```
test-results/
  → playwright-parser.js（掃描目錄）
  → [{ acId, description, screenshots, ... }]
  → report-generator.js
  → clickup-client.js
  → 批次 ClickUp Subtask
```

### Web Dashboard

```
瀏覽器上傳截圖
  → POST /api/analyze（FormData）
  → 暫存圖片到 /tmp
  → analyzer.js（Claude API）
  → report-generator.js
  → JSON + Markdown 回傳前端
  → BugReportPreview 顯示
```

## 設定檔格式

### config.yaml

```yaml
clickup:
  workspace_id: ""              # env: CLICKUP_WORKSPACE_ID
  default_status: "NEEDS FIX"   # env: CLICKUP_DEFAULT_STATUS
  task_type: "Bug"
  include_priority: false
  include_tags: false

naming:
  pattern: "[{page}] - {summary}"

report:
  include_investigation: false
  include_priority_suggestion: false
  default_env: "Testing 測試站"
  default_device: "Desktop"
  template_file: "templates/bug-report.md"

ai:
  model: "claude-sonnet-4-6"     # env: AI_MODEL
  max_tokens: 2048
  system_prompt: |
    ...

pages:
  article:
    display_name: "文章頁"
    ac_file: "pages/article.yaml"
    test_url_pattern: "https://..."
```

### pages/*.yaml

```yaml
page_name: "文章頁"
test_url_pattern: "https://..."

sections:
  - name: "區塊名稱"
    acs:
      - id: "AC-1.1.1"
        title: "功能名稱"
        expected: "預期行為描述"
```

## 技術棧

| 層級 | 技術 |
|---|---|
| Runtime | Node.js 18+ (ESM) |
| CLI | Commander.js, chalk, ora |
| AI | @anthropic-ai/sdk (Claude API) |
| Template | Handlebars |
| Config | js-yaml |
| Web | Next.js 14, React 18, Tailwind CSS |
| Upload | react-dropzone |
| API | ClickUp REST API v2 |

## 擴展方式

### 新增頁面

1. 在 `config/pages/` 新增 `{key}.yaml`（遵循 `sections[].acs[]` 結構）
2. 在 `config/config.yaml` 的 `pages` 區塊註冊

### 修改報告格式

編輯 `config/templates/bug-report.md`（Handlebars 語法）

### 換不同的 Project Management 工具

替換 `core/clickup-client.js`，保持相同介面（`createTask`, `getTask` 等）

### 部署 Web Dashboard

```bash
cd web
npm install
npm run build
npm start        # 或部署到 Vercel
```
