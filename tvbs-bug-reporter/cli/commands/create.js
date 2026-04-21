/**
 * CLI Command: create
 * 將 Bug Report 資料建立為 ClickUp Subtask
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { createClickUpClient } from '../../core/clickup-client.js';
import { generateClickUpPayload } from '../../core/report-generator.js';
import { loadConfig } from '../../core/config-loader.js';

export async function createCmd(opts) {
  const { parent, list, from, stdin } = opts;

  // 讀取 Bug 資料
  let bugs = [];

  if (from) {
    const raw = readFileSync(resolve(from), 'utf-8');
    const data = JSON.parse(raw);
    bugs = Array.isArray(data) ? data : [data];
  } else if (stdin) {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf-8');
    const data = JSON.parse(raw);
    bugs = Array.isArray(data) ? data : [data];
  } else {
    console.error(chalk.red('❌ 請指定 --from <file> 或 --stdin'));
    process.exit(1);
  }

  if (bugs.length === 0) {
    console.error(chalk.red('❌ 沒有找到 Bug 資料'));
    process.exit(1);
  }

  // 檢查環境變數
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    console.error(chalk.red('❌ 請設定環境變數 CLICKUP_API_TOKEN'));
    process.exit(1);
  }

  const config = loadConfig();
  const client = createClickUpClient(token);

  console.log('');
  console.log(chalk.bold.cyan(`═══ 建立 ClickUp Subtask（共 ${bugs.length} 筆）═══`));
  console.log(`父卡片: ${parent}`);
  console.log(`List ID: ${list}`);
  console.log('');

  // 先取得父卡片的真實 ID（如果傳入的是 Custom ID 如 NS-2030）
  let parentTaskId = parent;
  const spinner = ora('取得父卡片資訊...').start();

  try {
    const parentTask = await client.getTask(parent);
    parentTaskId = parentTask.id;
    spinner.succeed(`父卡片: ${parentTask.name} (${parentTask.custom_id || parentTask.id})`);
  } catch (err) {
    spinner.warn(`無法取得父卡片資訊，使用原始 ID: ${parent}`);
  }

  // 逐一建單
  for (let i = 0; i < bugs.length; i++) {
    const bug = bugs[i];
    const payload = generateClickUpPayload(bug, parentTaskId, list);
    const taskSpinner = ora(`[${i + 1}/${bugs.length}] 建立: ${payload.name}`).start();

    try {
      const result = await client.createTask(list, {
        ...payload,
        parent: parentTaskId,
      });
      taskSpinner.succeed(
        `${chalk.green('✓')} ${payload.name} → ${chalk.blue(result.url || result.id)}`
      );
    } catch (err) {
      taskSpinner.fail(`${chalk.red('✗')} ${payload.name}: ${err.message}`);
    }

    // Rate limit
    if (i < bugs.length - 1) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  console.log('');
  console.log(chalk.green.bold('✅ 完成'));
}
