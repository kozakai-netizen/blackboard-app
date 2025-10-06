import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // blob URLs用に最適化を無効化
  },
};

export default nextConfig;
