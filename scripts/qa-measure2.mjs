import { chromium } from "playwright";
const BASE = "http://localhost:3003";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: {width:390, height:844}, deviceScaleFactor:2 });
const page = await ctx.newPage();
await page.request.post(`${BASE}/api/auth`, { data: {userId: 'p_xiaolan'} });

// 1. 信箱内"查看种子"按钮颜色
await page.goto(`${BASE}/mailbox`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const seedBtns = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('*'));
  return all.filter(el => el.textContent?.trim() === '查看种子').map(el => {
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      text: '查看种子',
      bg: s.backgroundColor,
      color: s.color,
      borderRadius: s.borderRadius,
      height: Math.round(r.height),
      width: Math.round(r.width),
      class: el.className.slice(0,120),
    };
  });
});
console.log("SEED_BTNS:", JSON.stringify(seedBtns, null, 2));

// 2. 检查返回箭头按钮的 padding/touch area
await page.goto(`${BASE}/invite/m_f4ed28a379b84e76`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const backBtn = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button, a'));
  return btns.filter(b => {
    const r = b.getBoundingClientRect();
    return r.x < 80 && r.height > 0;
  }).map(b => {
    const r = b.getBoundingClientRect();
    const s = window.getComputedStyle(b);
    return {
      tag: b.tagName,
      text: b.textContent?.trim().slice(0,20),
      height: Math.round(r.height),
      width: Math.round(r.width),
      padding: s.padding,
      class: b.className.slice(0,80),
    };
  });
});
console.log("BACK_BTN:", JSON.stringify(backBtn, null, 2));

// 3. 检查发种子页 chip 按钮大小
await page.goto(`${BASE}/seed/new`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const chipBtns = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  return btns.map(b => {
    const r = b.getBoundingClientRect();
    const s = window.getComputedStyle(b);
    return {
      text: b.textContent?.trim().slice(0,20),
      height: Math.round(r.height),
      width: Math.round(r.width),
      bg: s.backgroundColor,
      borderRadius: s.borderRadius,
    };
  }).filter(b => b.height > 0);
});
console.log("CHIPS:", JSON.stringify(chipBtns, null, 2));

// 4. 字体大小检查：页面标题、正文、辅助
await page.goto(`${BASE}/garden`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const fontSizes = await page.evaluate(() => {
  const results = [];
  // 页面标题 h1
  const h1 = document.querySelector('h1');
  if (h1) {
    const s = window.getComputedStyle(h1);
    results.push({ type: '页面标题 h1', fontSize: s.fontSize, fontWeight: s.fontWeight });
  }
  // 区块标题 h2/h3
  const sections = Array.from(document.querySelectorAll('h2, h3')).slice(0,3);
  sections.forEach(el => {
    const s = window.getComputedStyle(el);
    results.push({ type: `区块标题 ${el.tagName}`, fontSize: s.fontSize, fontWeight: s.fontWeight });
  });
  // 正文
  const paras = Array.from(document.querySelectorAll('p, span')).filter(el => el.textContent?.trim().length > 10).slice(0,3);
  paras.forEach(el => {
    const s = window.getComputedStyle(el);
    results.push({ type: `正文 ${el.tagName}`, fontSize: s.fontSize, fontWeight: s.fontWeight, text: el.textContent?.trim().slice(0,20) });
  });
  return results;
});
console.log("FONTS:", JSON.stringify(fontSizes, null, 2));

await browser.close();
