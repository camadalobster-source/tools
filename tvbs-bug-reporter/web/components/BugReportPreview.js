'use client';

import { useState } from 'react';

export default function BugReportPreview({ report, loading }) {
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
            <div className="h-3 bg-gray-200 rounded w-4/6" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-400">
        <svg
          className="mx-auto h-12 w-12 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm">上傳截圖並點擊「分析截圖」後，Bug Report 會顯示在這裡</p>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = report.markdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const confidenceColor = {
    high: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-red-600 bg-red-50',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* 標題列 */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900 text-sm">Bug Report</h3>
          {report.matched_ac && (
            <span className="text-xs text-gray-500">
              比對 AC: {report.matched_ac}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {report.confidence && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                confidenceColor[report.confidence] || 'text-gray-600 bg-gray-50'
              }`}
            >
              {report.confidence}
            </span>
          )}
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {copied ? '已複製' : '複製 Markdown'}
          </button>
        </div>
      </div>

      {/* 報告內容 */}
      <div className="p-4">
        <h4 className="font-bold text-gray-900 mb-3">{report.title}</h4>

        <div className="space-y-3 text-sm text-gray-700">
          {/* 環境 */}
          <div>
            <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
              環境
            </span>
            <p className="mt-0.5">
              {report.env} / {report.device}
            </p>
          </div>

          {/* 重現步驟 */}
          <div>
            <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
              重現步驟
            </span>
            <div className="mt-0.5 whitespace-pre-line">{report.steps}</div>
          </div>

          {/* 預期結果 */}
          <div>
            <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
              預期結果
            </span>
            <div className="mt-0.5 whitespace-pre-line text-green-700">
              {report.expected}
            </div>
          </div>

          {/* 實際結果 */}
          <div>
            <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
              實際結果
            </span>
            <div className="mt-0.5 whitespace-pre-line text-red-700">
              {report.actual}
            </div>
          </div>

          {/* 附件 */}
          {report.attachments && (
            <div>
              <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                附件
              </span>
              <div className="mt-0.5 whitespace-pre-line">{report.attachments}</div>
            </div>
          )}
        </div>
      </div>

      {/* JSON 展開 */}
      <details className="border-t border-gray-100">
        <summary className="px-4 py-2 text-xs text-gray-400 cursor-pointer hover:text-gray-600">
          查看原始 JSON
        </summary>
        <pre className="px-4 pb-3 text-xs text-gray-500 overflow-x-auto">
          {JSON.stringify(report, null, 2)}
        </pre>
      </details>
    </div>
  );
}
