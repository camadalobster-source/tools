/**
 * AI Analyzer
 * 使用 Claude API 分析截圖，比對 AC 驗收標準，產出結構化 Bug 資料
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { basename, extname } from 'path';
import { loadConfig, flattenACs } from './config-loader.js';

let _client = null;

/**
 * 初始化 Anthropic 客戶端
 */
function getClient() {
  if (_client) return _client;
  _client = new Anthropic();
  return _client;
}

/**
 * 將圖片檔轉為 Claude API 所需的 base64 格式
 * @param {string} imagePath - 圖片檔路徑
 * @returns {Object} { type, media_type, data }
 */
function imageToBase64(imagePath) {
  const ext = extname(imagePath).toLowerCase();
  const mediaTypeMap = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  const mediaType = mediaTypeMap[ext] || 'image/png';
  const data = readFileSync(imagePath).toString('base64');

  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: mediaType,
      data,
    },
  };
}

/**
 * AI 分析截圖並產出結構化 Bug 資料
 * @param {Object} options
 * @param {string[]} options.imagePaths - 截圖檔路徑
 * @param {string} options.pageKey - 頁面 key（article, video 等）
 * @param {string} [options.userDescription] - 使用者的問題描述
 * @param {string} [options.env] - 環境
 * @param {string} [options.device] - 裝置
 * @param {string} [options.testUrl] - 測試連結
 * @returns {Object} 結構化的 Bug 資料
 */
export async function analyzeScreenshots(options) {
  const {
    imagePaths,
    pageKey,
    userDescription = '',
    env,
    device,
    testUrl = '',
  } = options;

  const config = loadConfig();
  const acs = flattenACs(pageKey);
  const pageName = config.pages[pageKey]?.display_name || pageKey;

  // 建構 AI 訊息
  const content = [];

  // 加入截圖
  for (const imgPath of imagePaths) {
    content.push(imageToBase64(imgPath));
    content.push({
      type: 'text',
      text: `[截圖: ${basename(imgPath)}]`,
    });
  }

  // 加入分析指令
  const acList = acs
    .map((ac) => `- ${ac.id} (${ac.title}): ${ac.expected}`)
    .join('\n');

  content.push({
    type: 'text',
    text: `
## 請分析以上截圖，找出 Bug 並產出結構化報告

### 頁面：${pageName}
### 使用者描述：${userDescription || '（未提供，請根據截圖判斷）'}
### 測試連結：${testUrl || '（未提供）'}

### 該頁面的 AC 驗收標準：
${acList}

### 請回傳以下 JSON 格式（嚴格遵守，不要加其他文字）：
{
  "summary": "一句話描述問題核心",
  "page": "${pageName}",
  "env": "${env || config.report.default_env}",
  "device": "${device || config.report.default_device}",
  "matched_ac": "最相關的 AC ID（如 AC-1.4.6）",
  "steps": "1. 步驟一\\n2. 步驟二\\n3. 步驟三",
  "expected": "依據 AC 的正確行為",
  "actual": "當前錯誤的狀態",
  "test_url": "${testUrl}",
  "confidence": "high/medium/low"
}
`,
  });

  const client = getClient();
  const response = await client.messages.create({
    model: config.ai.model,
    max_tokens: config.ai.max_tokens,
    system: config.ai.system_prompt,
    messages: [{ role: 'user', content }],
  });

  // 解析 AI 回應
  const text = response.content[0]?.text || '';

  try {
    // 嘗試從回應中提取 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 回應中找不到 JSON');
    }
    const parsed = JSON.parse(jsonMatch[0]);

    // 組裝完整的 Bug 資料
    const title = `[${parsed.page}] - ${parsed.summary}`;
    return {
      title,
      page: parsed.page,
      summary: parsed.summary,
      env: parsed.env,
      device: parsed.device,
      matched_ac: parsed.matched_ac,
      steps: parsed.steps.split('\n').map(s => s.trim()).join('\n'),
      expected: `* ${parsed.expected}`,
      actual: `* ${parsed.actual}`,
      attachments: [
        testUrl ? `* **測試連結:** ${testUrl}` : null,
        `* **證據:** ${imagePaths.map(p => basename(p)).join(', ')}`,
      ].filter(Boolean).join('\n'),
      confidence: parsed.confidence,
      raw_response: text,
    };
  } catch (parseErr) {
    // JSON 解析失敗時，回傳原始文字
    return {
      title: `[${pageName}] - ${userDescription || 'AI 分析結果'}`,
      page: pageName,
      summary: userDescription || 'AI 分析結果（需人工確認）',
      env: env || config.report.default_env,
      device: device || config.report.default_device,
      steps: '（AI 分析失敗，請手動填寫）',
      expected: '（請參考 AC 驗收標準）',
      actual: `（AI 原始回應）\n${text}`,
      attachments: `* **證據:** ${imagePaths.map(p => basename(p)).join(', ')}`,
      confidence: 'low',
      raw_response: text,
      parse_error: parseErr.message,
    };
  }
}
