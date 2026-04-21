'use client';

export default function PageSelector({ pages, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        頁面類型
      </label>
      <div className="flex gap-2 flex-wrap">
        {pages.map((p) => (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              value === p.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
