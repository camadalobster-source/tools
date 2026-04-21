/**
 * Playwright Parser
 * 解析 Playwright test-results/ 資料夾，萃取失敗案例為結構化 Bug 資料
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { resolve, join, basename } from 'path';
import { glob } from 'glob';

/**
 * 解析測試資料夾名稱，萃取 AC ID 和測試描述
 * 範例：video-system-⑭-失效處理-AC-10--4d375--應使用-Live-專屬預設圖（非-VOD-縮圖降級）-tvbs-mobile
 * @param {string} dirName
 * @returns {Object} { acId, description, platform }
 */
function parseTestDirName(dirName) {
  // 嘗試萃取 AC ID（如 AC-10、AC-3.7）
  const acMatch = dirName.match(/AC-(\d+(?:\.\d+)?)/i);
  const acId = acMatch ? `AC-${acMatch[1]}` : null;

  // 嘗試萃取平台（tvbs-mobile / tvbs-desktop）
  const platformMatch = dirName.match(/tvbs-(mobile|desktop)/i);
  const platform = platformMatch ? platformMatch[1] : 'unknown';

  // 清理描述
  let description = dirName
    .replace(/^video-system-/, '')
    .replace(/^home-/, '')
    .replace(/-tvbs-(mobile|desktop).*$/, '')
    .replace(/-retry\d+$/, '')
    .replace(/--[a-f0-9]{5}--/g, ' — ')
    .replace(/-/g, ' ')
    .trim();

  return { acId, description, platform };
}

/**
 * 掃描 test-results 資料夾，找出所有失敗的測試案例
 * @param {string} testResultsPath - test-results/ 的絕對路徑
 * @returns {Array<Object>} 失敗案例列表
 */
export function parseTestResults(testResultsPath) {
  if (!existsSync(testResultsPath)) {
    throw new Error(`test-results 資料夾不存在: ${testResultsPath}`);
  }

  const entries = readdirSync(testResultsPath);
  const failures = [];

  for (const entry of entries) {
    const fullPath = join(testResultsPath, entry);
    const stat = statSync(fullPath);

    // 處理資料夾（Playwright 標準輸出）
    if (stat.isDirectory()) {
      // 跳過 retry 資料夾（只取最後一次）
      if (entry.includes('-retry')) continue;

      const screenshots = findScreenshots(fullPath);
      const errorContext = readErrorContext(fullPath);
      const traceFile = findTrace(fullPath);
      const parsed = parseTestDirName(entry);

      if (screenshots.length > 0 || errorContext) {
        failures.push({
          dirName: entry,
          path: fullPath,
          ...parsed,
          screenshots,
          errorContext,
          traceFile,
          source: 'playwright',
        });
      }
    }

    // 處理獨立的圖片檔（手動測試截圖）
    if (stat.isFile() && /\.(png|jpg|jpeg)$/i.test(entry)) {
      failures.push({
        dirName: entry,
        path: fullPath,
        acId: null,
        description: basename(entry, /\.[^.]+$/.exec(entry)?.[0] || ''),
        platform: 'manual',
        screenshots: [fullPath],
        errorContext: null,
        traceFile: null,
        source: 'manual',
      });
    }
  }

  return failures;
}

/**
 * 找出資料夾內的截圖檔
 */
function findScreenshots(dirPath) {
  const files = readdirSync(dirPath);
  return files
    .filter((f) => /^test-failed.*\.(png|jpg|jpeg)$/i.test(f))
    .map((f) => join(dirPath, f));
}

/**
 * 讀取 error-context.md（如果存在）
 */
function readErrorContext(dirPath) {
  const errorFile = join(dirPath, 'error-context.md');
  if (existsSync(errorFile)) {
    return readFileSync(errorFile, 'utf-8');
  }
  return null;
}

/**
 * 找出 trace.zip（如果存在）
 */
function findTrace(dirPath) {
  const traceFile = join(dirPath, 'trace.zip');
  return existsSync(traceFile) ? traceFile : null;
}

/**
 * 解析 BUGS-for-engineers.md 彙整檔
 * @param {string} mdFilePath - .md 檔案路徑
 * @returns {Array<Object>} 結構化的 Bug 列表
 */
export function parseBugMarkdown(mdFilePath) {
  if (!existsSync(mdFilePath)) {
    throw new Error(`Bug 彙整檔不存在: ${mdFilePath}`);
  }

  const content = readFileSync(mdFilePath, 'utf-8');
  const bugs = [];

  // 以 ## 🔴 Bug 分割
  const sections = content.split(/^## 🔴 /m).slice(1);

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const titleLine = lines[0] || '';

    // 萃取 Bug 標題和 AC ID
    const acMatch = titleLine.match(/AC-[\d.]+/);
    const acId = acMatch ? acMatch[0] : null;

    // 萃取各區塊
    const bug = {
      rawTitle: titleLine.replace(/^Bug \d+ — /, ''),
      acId,
      sections: {},
    };

    let currentSection = null;
    for (const line of lines.slice(1)) {
      if (line.startsWith('### ')) {
        currentSection = line.replace('### ', '').trim();
        bug.sections[currentSection] = [];
      } else if (currentSection) {
        bug.sections[currentSection].push(line);
      }
    }

    // 清理各區塊內容
    for (const key of Object.keys(bug.sections)) {
      bug.sections[key] = bug.sections[key].join('\n').trim();
    }

    bugs.push(bug);
  }

  return bugs;
}

/**
 * 產生測試結果的摘要統計
 * @param {Array<Object>} failures
 * @returns {Object} { total, byPlatform, byAC }
 */
export function summarize(failures) {
  const byPlatform = {};
  const byAC = {};

  for (const f of failures) {
    // by platform
    byPlatform[f.platform] = (byPlatform[f.platform] || 0) + 1;
    // by AC
    if (f.acId) {
      byAC[f.acId] = (byAC[f.acId] || 0) + 1;
    }
  }

  return {
    total: failures.length,
    byPlatform,
    byAC,
  };
}
