import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // デモモードでは静的生成を無効化
  ...(process.env.DEMO_MODE === 'true' && {
    output: 'standalone',
  }),
};

export default nextConfig;
