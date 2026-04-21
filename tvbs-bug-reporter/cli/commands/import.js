/**
 * CLI Command: import
 * 匯入 Playwright test-results → 解析失敗案例 → 產出 Bug Report
 */

import { resolve } from 'path';
import chalk from 'chalk';
import { parseTestResults, summarize } from '../../core/playwright-parser.js';

export async function importCmd(opts) {
  const { path: testPath, page, json } = opts;

  const fullPath = resolve(testPath);

  try {
    const failures = parseTestResults(fullPath);
    const stats = summarize(failures);

    if (json) {
      console.log(JSON.stringify({ stats, failures }, null, 2));
      return;
    }

    // 顯示摘要
    console.log('');
    console.log(chalk.bold.cyan('═══ Playwright Test Results ═══'));
    console.log(`📂 路徑: ${fullPath}`);
    console.log(`❌ 失敗案例: ${chalk.red.bold(stats.total)} 件`);
    console.log('');

    // 平台分佈
    if (Object.keys(stats.byPlatform).length > 0) {
      console.log(chalk.dim('平台分佈:'));
      for (const [platform, count] of Object.entries(stats.byPlatform)) {
        console.log(`  ${platform}: ${count} 件`);
      }
      console.log('');
    }

    // AC 分佈
    if (Object.keys(stats.byAC).length > 0) {
      console.log(chalk.dim('AC 分佈:'));
      for (const [ac, count] of Object.entries(stats.byAC)) {
        console.log(`  ${ac}: ${count} 件`);
      }
      console.log('');
    }

    // 列出每個失敗案例
    console.log(chalk.bold('失敗案例列表:'));
    failures.forEach((f, i) => {
      const acTag = f.acId ? chalk.yellow(`[${f.acId}]`) : chalk.dim('[無 AC]');
      const platformTag = chalk.dim(`(${f.platform})`);
      const screenshotCount = f.screenshots.length;
      const screenshotInfo = screenshotCount > 0 ? chalk.green(`📸 ${screenshotCount}`) : '';

      console.log(`  ${i + 1}. ${acTag} ${f.description} ${platformTag} ${screenshotInfo}`);
    });

    console.log('');
    console.log(chalk.dim('提示: 加上 --json 可取得 JSON 格式，搭配 create 指令批次建單'));
  } catch (err) {
    console.error(chalk.red(`❌ ${err.message}`));
    process.exit(1);
  }
}
