import { chromium } from "playwright";
const BASE = "http://localhost:3003";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: {width:390, height:844}, deviceScaleFactor:2 });
const page = await ctx.newPage();
await page.request.post(`${BASE}/api/auth`, { data: {userId: 'p_xiaolan'} });

// room scrolled to top
await page.goto(`${BASE}/room/r_8482a80f0dbc43c6`, { waitUntil: "networkidle" });
await page.waitForTimeout(1400);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
await page.screenshot({ path: "shots/qa-design/16-room-sprout-top.png" });
console.log("shots/qa-design/16-room-sprout-top.png");

// check mailbox detail - already delivered match to view invite detail
await page.goto(`${BASE}/invite/m_f4ed28a379b84e76`, { waitUntil: "networkidle" });
await page.waitForTimeout(1400);
await page.screenshot({ path: "shots/qa-design/17-invite-detail.png" });
console.log("shots/qa-design/17-invite-detail.png");

// seed/mine (candidate selection)
await page.goto(`${BASE}/seed/s_70ea58ab69de4556`, { waitUntil: "networkidle" });
await page.waitForTimeout(1400);
await page.screenshot({ path: "shots/qa-design/18-seed-candidates.png" });
console.log("shots/qa-design/18-seed-candidates.png");

await browser.close();
