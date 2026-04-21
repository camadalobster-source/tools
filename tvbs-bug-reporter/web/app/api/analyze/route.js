/**
 * API Route: POST /api/analyze
 * 接收截圖 + 參數 → 呼叫 Claude API 分析 → 回傳結構化 Bug Report
 */

import { NextResponse } from 'next/server';
import { writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

// 用 import.meta.url 定位 core 模組的絕對路徑，避免相對路徑在 build 時出錯
const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE_DIR = resolve(__dirname, '..', '..', '..', '..', 'core');

async function loadCore() {
  const configLoader = await import(/* webpackIgnore: true */ `${CORE_DIR}/config-loader.js`);
  const analyzer = await import(/* webpackIgnore: true */ `${CORE_DIR}/analyzer.js`);
  const reportGenerator = await import(/* webpackIgnore: true */ `${CORE_DIR}/report-generator.js`);
  return { configLoader, analyzer, reportGenerator };
}

export async function POST(request) {
  const tmpFiles = [];

  try {
    const formData = await request.formData();
    const images = formData.getAll('images');
    const page = formData.get('page') || 'article';
    const description = formData.get('description') || '';
    const env = formData.get('env') || 'Testing 測試站';
    const device = formData.get('device') || 'Desktop';
    const testUrl = formData.get('testUrl') || '';

    if (!images || images.length === 0) {
      return NextResponse.json({ error: '請上傳至少一張截圖' }, { status: 400 });
    }

    // 儲存上傳的圖片到暫存目錄
    const tmpDir = join(tmpdir(), 'tvbs-bug-reporter');
    mkdirSync(tmpDir, { recursive: true });

    const imagePaths = [];
    for (const image of images) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const ext = image.name.split('.').pop() || 'png';
      const tmpPath = join(tmpDir, `${randomUUID()}.${ext}`);
      writeFileSync(tmpPath, buffer);
      imagePaths.push(tmpPath);
      tmpFiles.push(tmpPath);
    }

    // 呼叫 core analyzer
    const { analyzer, reportGenerator } = await loadCore();

    const result = await analyzer.analyzeScreenshots({
      imagePaths,
      pageKey: page,
      userDescription: description,
      env,
      device,
      testUrl,
    });

    // 產生 Markdown 報告
    const markdown = reportGenerator.generateReport(result);

    return NextResponse.json({
      ...result,
      markdown,
    });
  } catch (err) {
    console.error('Analyze API error:', err);
    return NextResponse.json(
      { error: err.message || '分析失敗' },
      { status: 500 }
    );
  } finally {
    // 清理暫存檔
    for (const f of tmpFiles) {
      try {
        unlinkSync(f);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
