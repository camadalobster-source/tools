# TVBS Bug Reporter — Cowork Skill

## 觸發條件

當使用者提到以下關鍵字時啟動：
- "建立 bug 單"、"bug report"、"回報 bug"
- "分析截圖"、"截圖分析"
- "建立 ClickUp subtask"

## 流程

### Step 1: 收集資訊

向使用者確認以下資訊：

1. **父卡片 Task ID**（必填）— ClickUp 的卡片編號，例如 `NS-2030`
2. **頁面類型**（必填）— article / video / home / category
3. **問題類別**
   - 前台顯示問題
   - 功能異常
   - 資料不一致
   - 效能問題
4. **問題描述**（必填）— 使用者描述遇到的問題
5. **截圖**（選填）— 使用者可上傳截圖
6. **環境資訊**（有預設值）
   - 環境：Testing 測試站 / Production 正式站
   - 裝置：Desktop / Mobile / Both
7. **測試網址**（選填）

### Step 2: AI 分析（如有截圖）

如果使用者提供截圖：
1. 載入對應頁面的 AC 定義（從 `config/pages/{page}.yaml`）
2. 使用 Claude API 分析截圖，比對 AC 清單
3. 產出結構化 Bug 資料

如果沒有截圖：
1. 根據使用者描述，手動比對 AC
2. 組合 Bug 資料

### Step 3: 產出 Bug Report

使用 `config/templates/bug-report.md` 模板產出報告，包含：
- 標題：`[{頁面名稱}] - {問題摘要}`
- 環境資訊
- 重現步驟
- 預期結果
- 實際結果
- 附件（截圖連結）

### Step 4: 確認

**必須**將完整報告內容呈現給使用者確認，等待使用者說「好」或「確認」後才執行建單。

### Step 5: 建立 ClickUp Subtask

使用 ClickUp MCP 工具建立 Subtask：
- 父卡片：使用者提供的 Task ID
- 狀態：`NEEDS FIX`
- 內容：Step 3 產出的 Markdown

## 設定參考

- 主設定檔：`config/config.yaml`
- 頁面 AC 定義：`config/pages/*.yaml`
- 報告模板：`config/templates/bug-report.md`

## 注意事項

1. **先確認再建單**：每次都要把報告內容給使用者看過，確認後才建立 ClickUp 單
2. **不加優先級**：config 中 `include_priority: false`
3. **不加 Tag**：config 中 `include_tags: false`
4. **不加排查內容**：config 中 `include_investigation: false`，除非使用者主動提供
5. **截圖需手動附加**：由於 Cowork 對話中的圖片無法直接上傳到 ClickUp，需提醒使用者手動附加
