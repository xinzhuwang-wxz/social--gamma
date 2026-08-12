/**
 * QA 设计走查截图脚本
 * 运行：node scripts/qa-screenshots.mjs
 * 输出到 shots/qa-design/
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3003";
const OUT = "shots/qa-design";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function makeCtx(userId) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const r = await page.request.post(`${BASE}/api/auth`, { data: { userId } });
  if (!r.ok()) throw new Error(`login failed for ${userId}: ${r.status()}`);
  return { ctx, page };
}

async function shot(page, name, scrollPx = 0) {
  await page.waitForTimeout(1400);
  if (scrollPx > 0) {
    await page.evaluate((px) => window.scrollTo(0, px), scrollPx);
    await page.waitForTimeout(600);
  }
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(path);
}

// ==== 用户 1：小蓝 (p_xiaolan) ====
const { ctx: ctx1, page: p1 } = await makeCtx("p_xiaolan");

// 1. 花园首页 - top
await p1.goto(`${BASE}/garden`, { waitUntil: "networkidle" });
await shot(p1, "01-garden-top");

// 2. 花园首页 - 滚动下半
await shot(p1, "02-garden-scroll", 300);

// 3. 发布种子页
await p1.goto(`${BASE}/seed/new`, { waitUntil: "networkidle" });
await shot(p1, "03-seed-new");

// 4. 种子信箱 - 默认 tab (收到的)
await p1.goto(`${BASE}/mailbox`, { waitUntil: "networkidle" });
await shot(p1, "04-mailbox-received");

// 5. 信箱 - 等待回应 tab
try {
  await p1.click('text=等待回应', { timeout: 3000 });
  await shot(p1, "05-mailbox-waiting");
} catch {
  await p1.screenshot({ path: `${OUT}/05-mailbox-waiting.png` });
  console.log(`${OUT}/05-mailbox-waiting.png`);
}

// 6. 种子详情页 (p_xiaolan 收到的 - 用 delivered seed)
await p1.goto(`${BASE}/invite/s_70ea58ab69de4556`, { waitUntil: "networkidle" });
await shot(p1, "06-seed-detail-invite");

// 尝试 seed/mine 查看发起人候选人视图
await p1.goto(`${BASE}/seed/mine`, { waitUntil: "networkidle" });
await shot(p1, "07-seed-mine-matching");

// 8. 行动房间 - bloom stage
await p1.goto(`${BASE}/room/r_0bfce91d1d6b4ba8`, { waitUntil: "networkidle" });
await shot(p1, "08-room-top");

// room scroll down to chat
await shot(p1, "09-room-scroll", 400);

// 9. 公共花园
await p1.goto(`${BASE}/plaza`, { waitUntil: "networkidle" });
await shot(p1, "10-plaza");

// 10. 共同回忆
await p1.goto(`${BASE}/memory/mem_232f5027f7db4784`, { waitUntil: "networkidle" });
await shot(p1, "11-memory-detail");

// 11. 我的页面
await p1.goto(`${BASE}/me`, { waitUntil: "networkidle" });
await shot(p1, "12-me-top");
await shot(p1, "12b-me-scroll", 400);

// 12. 行动列表
await p1.goto(`${BASE}/actions`, { waitUntil: "networkidle" });
await shot(p1, "13-actions-list");

// 13. 森林
await p1.goto(`${BASE}/forest`, { waitUntil: "networkidle" });
await shot(p1, "14-forest");

// 14. room with pact/discussion stage (try different rooms)
await p1.goto(`${BASE}/room/r_c9e3d4489fb24f5c`, { waitUntil: "networkidle" });
await shot(p1, "15-room2");

await ctx1.close();
await browser.close();
console.log("\nAll screenshots saved to shots/qa-design/");
