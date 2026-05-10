import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  serverExternalPackages: ['onnxruntime-node'],
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Tailwind/PostCSS handled automatically
};

export default nextConfig;
