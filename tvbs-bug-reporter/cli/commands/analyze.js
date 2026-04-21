/**
 * CLI Command: analyze
 * 上傳截圖 → AI 分析 → 產出 Bug Report
 */

import { resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { analyzeScreenshots } from '../../core/analyzer.js';
import { generateReport, generateTitle } from '../../core/report-generator.js';
import { getAvailablePages } from '../../core/config-loader.js';

export async function analyzeCmd(opts) {
  const { image, page, description, env, device, url, json } = opts;

  // 驗證頁面 key
  const pages = getAvailablePages();
  const pageKeys = pages.map((p) => p.key);
  if (!pageKeys.includes(page)) {
    console.error(chalk.red(`❌ 無效的頁面 key: "${page}"`));
    console.error(`   可用選項: ${pageKeys.join(', ')}`);
    process.exit(1);
  }

  // 解析圖片路徑
  const imagePaths = image.map((p) => resolve(p));

  const spinner = ora('🔍 AI 正在分析截圖...').start();

  try {
    const result = await analyzeScreenshots({
      imagePaths,
      pageKey: page,
      userDescription: description,
      env,
      device,
      testUrl: url,
    });

    spinner.succeed('分析完成');

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // 產出 Markdown
    const markdown = generateReport(result);
    const title = result.title || generateTitle({ page: result.page, summary: result.summary });

    console.log('');
    console.log(chalk.bold.cyan('═══ Bug Report ═══'));
    console.log(chalk.bold(`標題: ${title}`));
    console.log(chalk.dim(`AI 信心度: ${result.confidence}`));
    if (result.matched_ac) {
      console.log(chalk.yellow(`比對 AC: ${result.matched_ac}`));
    }
    console.log('');
    console.log(markdown);
    console.log('');
    console.log(chalk.dim('提示: 加上 --json 可取得 JSON 格式，搭配 create 指令建立 ClickUp 單'));
  } catch (err) {
    spinner.fail('分析失敗');
    console.error(chalk.red(err.message));
    process.exit(1);
  }
}
