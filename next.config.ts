import type { NextConfig } from "next";
import path from "path";

const isCI = process.env.CI === 'true';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // blob URLs用に最適化を無効化
  },
  // ✅ Workspace root を明示（複数lockfile警告を解消）
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // ✅ ESLintエラーを警告に緩和（CI のみ）
  eslint: {
    ignoreDuringBuilds: isCI, // CI では ESLint エラー/警告で build を止めない
  },
  typescript: {
    // ビルド時のTypeScriptエラーは検出（警告は許可）
    ignoreBuildErrors: false,
  },

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
