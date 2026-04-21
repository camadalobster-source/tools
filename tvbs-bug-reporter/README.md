# TVBS Bug Reporter

AI 驅動的 Bug 回報工具，專為 TVBS 新聞網改版專案設計。自動分析截圖、比對 AC（Acceptance Criteria）、產出結構化 Bug Report，並建立 ClickUp Subtask。

## 功能

- **AI 截圖分析** — 上傳截圖，Claude 自動辨識問題並比對對應的 AC
- **Playwright 匯入** — 解析 Playwright test-results 資料夾，批次產出 Bug Report
- **ClickUp 建單** — 一鍵將 Bug Report 建為 ClickUp Subtask，狀態自動設為 `NEEDS FIX`
- **YAML 設定驅動** — SOP 規則、頁面 AC、報告格式皆可透過設定檔調整

## 安裝

```bash
cd tvbs-bug-reporter
npm install
cp .env.example .env
# 編輯 .env，填入 API keys
```

### 環境變數

| 變數 | 說明 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API 金鑰（AI 截圖分析用） |
| `CLICKUP_API_TOKEN` | ClickUp API Token（建單用） |
| `CLICKUP_WORKSPACE_ID` | ClickUp Workspace ID |

## CLI 使用方式

### analyze — AI 分析截圖

```bash
node cli/index.js analyze -i ./screenshot.png -p article -d "手機版 YT 嵌入比例異常"
node cli/index.js analyze -i ./img1.png ./img2.png -p video --json
```

### import — 匯入 Playwright 測試結果

```bash
node cli/index.js import --path ./test-results
node cli/index.js import --path ./test-results --json
```

### create — 建立 ClickUp Subtask

```bash
# 從 JSON 檔案建單
node cli/index.js create --from ./bugs.json --parent NS-2030 --list 900000000

# 搭配 pipe（analyze → create）
node cli/index.js analyze -i ./screenshot.png -p article --json | \
  node cli/index.js create --stdin --parent NS-2030 --list 900000000
```

## 專案結構

```
tvbs-bug-reporter/
├── config/
│   ├── config.yaml              # 主設定（ClickUp、命名規則、AI model）
│   ├── pages/                   # 各頁面 AC 定義
│   │   ├── article.yaml         # 文章頁 AC（NS-2030）
│   │   ├── video.yaml           # 影音頁 AC（NS-2263）
│   │   ├── home.yaml            # 首頁（placeholder）
│   │   └── category.yaml        # 分類頁（placeholder）
│   └── templates/
│       └── bug-report.md        # Handlebars 報告模板
├── core/                        # 共用核心模組
│   ├── analyzer.js              # Claude API 截圖分析
│   ├── clickup-client.js        # ClickUp REST API 封裝
│   ├── config-loader.js         # YAML/模板載入器
│   ├── report-generator.js      # 報告產出引擎（Handlebars）
│   ├── playwright-parser.js     # Playwright test-results 解析
│   └── index.js                 # Barrel export
├── cli/                         # CLI 入口（Commander.js）
│   ├── index.js                 # 主程式 + 指令註冊
│   └── commands/
│       ├── analyze.js           # analyze 指令
│       ├── import.js            # import 指令
│       └── create.js            # create 指令
├── skill/
│   └── SKILL.md                 # Cowork Skill 定義
└── web/                         # Web Dashboard（Phase 3）
```

## 設定調整

### 新增頁面

在 `config/pages/` 新增 YAML 檔，格式參考 `article.yaml`：

```yaml
page:
  key: new-page
  name: 新頁面
  clickup_task: "NS-XXXX"

acceptance_criteria:
  - id: "AC-1.1"
    description: "描述"
    area: "區域"
```

### 修改報告格式

編輯 `config/templates/bug-report.md`，使用 Handlebars 語法。

### 調整 ClickUp 設定

編輯 `config/config.yaml` 中的 `clickup` 區塊。

## 三種使用方式

| 入口 | 適用情境 | 狀態 |
|---|---|---|
| **Cowork Skill** | 對話式回報，適合 PM 日常使用 | Done |
| **CLI** | 搭配 Playwright CI/CD，批次建單 | Done |
| **Web Dashboard** | 視覺化分析 + 測試結果總覽 | Phase 3 |

## License

Private — TVBS 內部使用
