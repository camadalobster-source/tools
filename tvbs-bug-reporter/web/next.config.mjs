/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允許從上層目錄 import core 模組
  transpilePackages: [],
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
};

export default nextConfig;
