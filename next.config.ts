import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'smartbtc.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.smartbtc.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'bscscan.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.bscscan.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pancakeswap.finance',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
