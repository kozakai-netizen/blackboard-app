import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // blob URLs用に最適化を無効化
  },
  // ✅ Workspace root を明示（複数lockfile警告を解消）
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // ✅ ssh2のネイティブモジュールをバンドルから除外
  webpack: (config, { isServer }) => {
    if (isServer) {
      // サーバーサイドでは外部モジュールとして扱う
      config.externals = config.externals || [];
      config.externals.push('ssh2');
    }
    return config;
  },
};

export default nextConfig;
