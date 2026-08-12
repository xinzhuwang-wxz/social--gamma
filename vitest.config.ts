import { defineConfig } from "vitest/config";
import path from "node:path";
import fs from "node:fs";

// 加载 .env.local（真实 ARK 密钥）
const envFile = path.resolve(__dirname, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 90000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
