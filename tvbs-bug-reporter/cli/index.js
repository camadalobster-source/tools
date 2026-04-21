#!/usr/bin/env node

/**
 * TVBS Bug Reporter CLI
 *
 * Usage:
 *   bug-report analyze --image ./screenshot.png --page article
 *   bug-report import --path ./test-results --parent NS-2263
 *   bug-report create --from ./bug-report.json --parent NS-2030
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const program = new Command();

program
  .name('bug-report')
  .description('AI-driven Bug Reporter for TVBS News Web')
  .version('0.1.0');

// ─── analyze：AI 分析截圖 ───
program
  .command('analyze')
  .description('上傳截圖，用 AI 分析問題並產出 Bug Report')
  .requiredOption('-i, --image <paths...>', '截圖檔路徑（可多張）')
  .requiredOption('-p, --page <key>', '頁面 key（article, video, home, category）')
  .option('-d, --description <text>', '問題描述')
  .option('-e, --env <env>', '環境', 'Testing 測試站')
  .option('--device <device>', '裝置', 'Desktop')
  .option('-u, --url <url>', '測試連結')
  .option('--json', '以 JSON 格式輸出')
  .action(async (opts) => {
    const { analyzeCmd } = await import('./commands/analyze.js');
    await analyzeCmd(opts);
  });

// ─── import：匯入 Playwright test-results ───
program
  .command('import')
  .description('匯入 Playwright test-results 資料夾，解析失敗案例')
  .requiredOption('--path <dir>', 'test-results/ 資料夾路徑')
  .option('-p, --page <key>', '頁面 key（用於比對 AC）')
  .option('--json', '以 JSON 格式輸出')
  .action(async (opts) => {
    const { importCmd } = await import('./commands/import.js');
    await importCmd(opts);
  });

// ─── create：建立 ClickUp 單 ───
program
  .command('create')
  .description('將 Bug Report 建立為 ClickUp Subtask')
  .requiredOption('--parent <taskId>', '父卡片 Task ID（如 NS-2030）')
  .requiredOption('--list <listId>', 'ClickUp List ID')
  .option('--from <file>', '從 JSON 檔案讀取 Bug 資料')
  .option('--stdin', '從 stdin 讀取 JSON 資料（可搭配 pipe）')
  .action(async (opts) => {
    const { createCmd } = await import('./commands/create.js');
    await createCmd(opts);
  });

program.parse();
