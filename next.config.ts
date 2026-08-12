import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 服务器部署：自包含产物（node .next/standalone/server.js）
  output: "standalone",
};

export default nextConfig;
