import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://api.80.225.223.71.nip.io/api/:path*',
      },
    ];
  },
};

export default nextConfig;
