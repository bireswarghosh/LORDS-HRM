import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  // output: "export",
  sassOptions: {
    includePaths: [path.join(__dirname, 'src/style')],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/login-2',
      },
    ];
  },
};

export default nextConfig;
