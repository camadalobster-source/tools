import './globals.css';

export const metadata = {
  title: 'TVBS Bug Reporter',
  description: 'AI-driven Bug Reporting Tool for TVBS News Web',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
