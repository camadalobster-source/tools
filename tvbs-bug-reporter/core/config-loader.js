/**
 * Config Loader
 * 載入 YAML 設定檔 + Markdown 模板，提供統一的存取介面
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = resolve(__dirname, '..', 'config');

let _config = null;
let _template = null;
const _pageACs = new Map();

/**
 * 載入主設定檔 config.yaml
 */
export function loadConfig() {
  if (_config) return _config;
  const raw = readFileSync(resolve(CONFIG_DIR, 'config.yaml'), 'utf-8');
  _config = yaml.load(raw);
  return _config;
}

/**
 * 載入 Bug Report Markdown 模板
 */
export function loadTemplate() {
  if (_template) return _template;
  const config = loadConfig();
  const templatePath = resolve(CONFIG_DIR, config.report.template_file);
  _template = readFileSync(templatePath, 'utf-8');
  return _template;
}

/**
 * 載入指定頁面的 AC 驗收標準
 * @param {string} pageKey - 頁面 key（如 'article', 'video'）
 */
export function loadPageACs(pageKey) {
  if (_pageACs.has(pageKey)) return _pageACs.get(pageKey);

  const config = loadConfig();
  const pageConfig = config.pages[pageKey];
  if (!pageConfig) {
    throw new Error(`Page "${pageKey}" not found in config. Available: ${Object.keys(config.pages).join(', ')}`);
  }

  const acPath = resolve(CONFIG_DIR, pageConfig.ac_file);
  const raw = readFileSync(acPath, 'utf-8');
  const acs = yaml.load(raw);
  _pageACs.set(pageKey, acs);
  return acs;
}

/**
 * 取得所有已註冊的頁面列表
 */
export function getAvailablePages() {
  const config = loadConfig();
  return Object.entries(config.pages).map(([key, val]) => ({
    key,
    displayName: val.display_name,
  }));
}

/**
 * 將所有 AC 攤平成一維陣列（方便 AI 比對）
 * @param {string} pageKey
 * @returns {Array<{id, title, expected, section}>}
 */
export function flattenACs(pageKey) {
  const pageACs = loadPageACs(pageKey);
  const flat = [];
  for (const section of pageACs.sections) {
    for (const ac of section.acs) {
      flat.push({
        id: ac.id,
        title: ac.title,
        expected: ac.expected,
        section: section.name,
      });
    }
  }
  return flat;
}

/**
 * 清除快取（測試用）
 */
export function clearCache() {
  _config = null;
  _template = null;
  _pageACs.clear();
}
