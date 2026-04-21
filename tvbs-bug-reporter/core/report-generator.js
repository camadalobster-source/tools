/**
 * Report Generator
 * 將結構化的 Bug 資料套用 Handlebars 模板，產出 Markdown
 */

import Handlebars from 'handlebars';
import { loadConfig, loadTemplate } from './config-loader.js';

let _compiledTemplate = null;

/**
 * 編譯模板（lazy init）
 */
function getCompiledTemplate() {
  if (_compiledTemplate) return _compiledTemplate;
  const templateStr = loadTemplate();
  _compiledTemplate = Handlebars.compile(templateStr, { noEscape: true });
  return _compiledTemplate;
}

/**
 * 產生 Bug Report 的標題（依照命名規則）
 * @param {Object} data - { page, summary }
 * @returns {string}
 */
export function generateTitle(data) {
  const config = loadConfig();
  const pattern = config.naming.pattern;
  return pattern
    .replace('{page}', data.page || '')
    .replace('{summary}', data.summary || '')
    .replace('{env}', data.env || '')
    .replace('{device}', data.device || '')
    .replace('{ac_id}', data.ac_id || '');
}

/**
 * 產生完整的 Bug Report Markdown
 * @param {Object} bugData
 * @param {string} bugData.title - 報告標題（含 [頁面] - 描述）
 * @param {string} bugData.env - 環境
 * @param {string} bugData.device - 裝置
 * @param {string} bugData.page - 頁面名稱
 * @param {string} bugData.steps - 重現步驟（Markdown 格式）
 * @param {string} bugData.expected - 預期結果
 * @param {string} bugData.actual - 實際結果
 * @param {string} bugData.attachments - 附件與證據
 * @param {string} [bugData.extra_notes] - 額外備註
 * @param {string} [bugData.investigation] - 初步排查（可選）
 * @param {string} [bugData.priority] - 優先級（可選）
 * @param {string} [bugData.priority_reason] - 優先級理由（可選）
 * @returns {string} Markdown 格式的 Bug Report
 */
export function generateReport(bugData) {
  const config = loadConfig();
  const template = getCompiledTemplate();

  // 根據設定決定是否包含特定欄位
  const data = { ...bugData };

  if (!config.report.include_investigation) {
    delete data.investigation;
  }
  if (!config.report.include_priority_suggestion) {
    delete data.priority;
    delete data.priority_reason;
  }

  // 套用預設值
  if (!data.env) data.env = config.report.default_env;
  if (!data.device) data.device = config.report.default_device;

  return template(data);
}

/**
 * 產生 ClickUp 建單所需的結構化資料
 * @param {Object} bugData - 同 generateReport 的參數
 * @param {string} parentTaskId - 父卡片 Task ID
 * @param {string} listId - ClickUp List ID
 * @returns {Object} ClickUp createTask 所需的參數
 */
export function generateClickUpPayload(bugData, parentTaskId, listId) {
  const config = loadConfig();
  const title = bugData.title || generateTitle(bugData);
  const markdown = generateReport(bugData);

  return {
    name: title,
    list_id: listId,
    parent: parentTaskId,
    task_type: config.clickup.task_type,
    status: config.clickup.default_status,
    markdown_description: markdown,
  };
}

/**
 * 批次產生多筆 Bug Report
 * @param {Array<Object>} bugs - Bug 資料陣列
 * @returns {Array<{title: string, markdown: string}>}
 */
export function generateBatchReports(bugs) {
  return bugs.map((bug) => ({
    title: bug.title || generateTitle(bug),
    markdown: generateReport(bug),
  }));
}
