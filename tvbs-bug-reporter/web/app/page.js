'use client';

import { useState } from 'react';
import ScreenshotUploader from '../components/ScreenshotUploader';
import BugReportPreview from '../components/BugReportPreview';
import PageSelector from '../components/PageSelector';

const PAGES = [
  { key: 'article', name: '文章頁' },
  { key: 'video', name: '影音頁' },
  { key: 'home', name: '首頁' },
  { key: 'category', name: '分類頁' },
];

export default function Home() {
  const [page, setPage] = useState('article');
  const [description, setDescription] = useState('');
  const [env, setEnv] = useState('Testing 測試站');
  const [device, setDevice] = useState('Desktop');
  const [testUrl, setTestUrl] = useState('');
  const [files, setFiles] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setError('請上傳至少一張截圖');
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('images', f));
      formData.append('page', page);
      formData.append('description', description);
      formData.append('env', env);
      formData.append('device', device);
      formData.append('testUrl', testUrl);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '分析失敗');
      }

      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          TVBS Bug Reporter
        </h1>
        <p className="text-gray-500 mt-1">
          上傳截圖，AI 自動分析問題並產出 Bug Report
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左側：輸入區 */}
        <div className="space-y-6">
          {/* 頁面選擇 */}
          <PageSelector pages={PAGES} value={page} onChange={setPage} />

          {/* 截圖上傳 */}
          <ScreenshotUploader files={files} onFilesChange={setFiles} />

          {/* 問題描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              問題描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述你遇到的問題（選填，AI 會根據截圖自動判斷）"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 環境資訊 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                環境
              </label>
              <select
                value={env}
                onChange={(e) => setEnv(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option>Testing 測試站</option>
                <option>Production 正式站</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                裝置
              </label>
              <select
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option>Desktop</option>
                <option>Mobile</option>
                <option>Both</option>
              </select>
            </div>
          </div>

          {/* 測試網址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              測試網址（選填）
            </label>
            <input
              type="url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://news-neo.tvbs-testing.com.tw/..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 送出按鈕 */}
          <button
            onClick={handleAnalyze}
            disabled={loading || files.length === 0}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors ${
              loading || files.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                AI 分析中...
              </span>
            ) : (
              '分析截圖'
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* 右側：報告預覽 */}
        <div>
          <BugReportPreview report={report} loading={loading} />
        </div>
      </div>
    </main>
  );
}
