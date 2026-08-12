/**
 * 无头截图走查：node scripts/screenshot.mjs [userId] [path1,path2,...]
 * 输出到 shots/ 目录（gitignore）。
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3003";
const userId = process.argv[2] ?? "p_xiaolan";
const paths = (process.argv[3] ?? "/garden,/mailbox,/actions,/forest,/me").split(",");

fs.mkdirSync("shots", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

// 登录拿会话 cookie
const r = await page.request.post(`${BASE}/api/auth`, { data: { userId } });
if (!r.ok()) throw new Error(`login failed: ${r.status()}`);

for (const p of paths) {
  await page.goto(BASE + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const name = p.replace(/\//g, "_").replace(/^_/, "") || "home";
  await page.screenshot({ path: `shots/${name}.png`, fullPage: false });
  console.log(`shots/${name}.png`);
}

await browser.close();
