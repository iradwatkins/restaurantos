import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    '@restaurantos/ui',
    '@restaurantos/config',
  ],
};

export default nextConfig;
