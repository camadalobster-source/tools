'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';

export default function ScreenshotUploader({ files, onFilesChange }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      onFilesChange((prev) => [...prev, ...acceptedFiles]);
    },
    [onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    multiple: true,
  });

  const removeFile = (index) => {
    onFilesChange((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        截圖上傳
      </label>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-gray-500">
          <svg
            className="mx-auto h-10 w-10 text-gray-400 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {isDragActive ? (
            <p className="text-sm text-blue-600">放開即可上傳</p>
          ) : (
            <p className="text-sm">
              拖曳截圖到這裡，或<span className="text-blue-600">點擊選擇檔案</span>
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">支援 PNG、JPG、GIF、WebP</p>
        </div>
      </div>

      {/* 已上傳的檔案列表 */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, i) => (
            <FilePreview
              key={`${file.name}-${i}`}
              file={file}
              onRemove={() => removeFile(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 獨立元件：管理單個檔案的 blob URL 生命週期，避免記憶體洩漏 */
function FilePreview({ file, onRemove }) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <img
          src={previewUrl}
          alt={file.name}
          className="w-10 h-10 object-cover rounded"
        />
        <div className="min-w-0">
          <p className="text-sm text-gray-700 truncate">{file.name}</p>
          <p className="text-xs text-gray-400">
            {(file.size / 1024).toFixed(0)} KB
          </p>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-red-500 transition-colors ml-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
