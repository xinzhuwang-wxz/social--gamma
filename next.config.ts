import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 服务器部署：自包含产物（node .next/standalone/server.js）
  output: "standalone",
  // 直接复用新前端 SPA（public/world）作为整个前端；根路径服务其入口。
  // 前端本体在 public/world/，以后前端调整都在本项目内进行。
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/world/index.html" },
        { source: "/pitch", destination: "/pitch/huatuobang-roadshow.html" },
        { source: "/pitch/", destination: "/pitch/huatuobang-roadshow.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
