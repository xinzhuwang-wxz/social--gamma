import { chromium } from "playwright";
const BASE = "http://localhost:3003";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: {width:390, height:844}, deviceScaleFactor:2 });
const page = await ctx.newPage();
await page.request.post(`${BASE}/api/auth`, { data: {userId: 'p_xiaolan'} });

// 1. 底部导航高度
await page.goto(`${BASE}/garden`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const navInfo = await page.evaluate(() => {
  // try various selectors
  const selectors = ['nav', '[class*="bottom-nav"]', '[class*="tab-bar"]', '[class*="bottom"]'];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const r = el.getBoundingClientRect();
      return { found: sel, height: r.height, top: r.top, class: el.className.slice(0,100) };
    }
  }
  // fallback: find element at bottom of screen
  const all = document.querySelectorAll('*');
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.top > 750 && r.height > 50 && r.width > 300) {
      return { found: 'fallback', height: r.height, top: r.top, class: el.className.slice(0,100) };
    }
  }
  return "not found";
});
console.log("NAV:", JSON.stringify(navInfo));

// 2. 按钮高度
await page.goto(`${BASE}/invite/m_f4ed28a379b84e76`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const btnInfo = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  return btns.map(b => {
    const r = b.getBoundingClientRect();
    const s = window.getComputedStyle(b);
    return {
      text: b.textContent?.trim().slice(0,20),
      height: Math.round(r.height),
      width: Math.round(r.width),
      bg: s.backgroundColor,
      color: s.color,
    };
  }).filter(b => b.height > 0);
});
console.log("INVITE_BUTTONS:", JSON.stringify(btnInfo, null, 2));

// 3. 信箱按钮
await page.goto(`${BASE}/mailbox`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const mailboxBtns = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button, a'));
  return btns.filter(b => {
    const r = b.getBoundingClientRect();
    return r.height > 20 && r.width > 50;
  }).slice(0, 15).map(b => {
    const r = b.getBoundingClientRect();
    const s = window.getComputedStyle(b);
    return {
      text: b.textContent?.trim().slice(0,25),
      height: Math.round(r.height),
      bg: s.backgroundColor,
      color: s.color,
    };
  });
});
console.log("MAILBOX_BTNS:", JSON.stringify(mailboxBtns, null, 2));

// 4. 卡片圆角
const cardRadius = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('[class*="card"], [class*="rounded"]'));
  return cards.slice(0,5).map(c => ({
    class: c.className.slice(0,60),
    borderRadius: window.getComputedStyle(c).borderRadius,
  }));
});
console.log("CARD_RADIUS:", JSON.stringify(cardRadius, null, 2));

// 5. Check agent message bg color
await page.goto(`${BASE}/room/r_0bfce91d1d6b4ba8`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const agentMsgColor = await page.evaluate(() => {
  // find warm yellow elements
  const all = Array.from(document.querySelectorAll('*'));
  const warm = all.filter(el => {
    const bg = window.getComputedStyle(el).backgroundColor;
    return bg && bg.includes('255, 244') || bg.includes('254, 243') || bg.includes('255, 245');
  });
  return warm.slice(0,3).map(el => ({
    tag: el.tagName,
    class: el.className.slice(0,60),
    bg: window.getComputedStyle(el).backgroundColor,
    text: el.textContent?.trim().slice(0,30),
  }));
});
console.log("AGENT_MSG:", JSON.stringify(agentMsgColor, null, 2));

await browser.close();
