/** 用 Chromium 把 SVG 图标渲染为 PWA PNG（192/512/apple-touch 180） */
import { chromium } from "playwright";

const svg = (s) => `<!doctype html><html><body style="margin:0">
<div id="icon" style="width:${s}px;height:${s}px;background:#F7F0DE;display:flex;align-items:center;justify-content:center;border-radius:0">
<svg width="${s * 0.72}" height="${s * 0.72}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <!-- 土丘 -->
  <ellipse cx="50" cy="86" rx="26" ry="9" fill="#A9753D"/>
  <ellipse cx="50" cy="84" rx="20" ry="6" fill="#B98550"/>
  <!-- 茎 -->
  <path d="M50 84 C50 66 50 56 50 46" stroke="#89974B" stroke-width="7" stroke-linecap="round" fill="none"/>
  <!-- 双叶 -->
  <path d="M50 58 C36 56 28 46 30 36 C42 38 50 46 50 58 Z" fill="#89974B"/>
  <path d="M50 52 C62 50 72 40 70 28 C56 30 50 40 50 52 Z" fill="#4D572E"/>
  <!-- 叶脉高光 -->
  <path d="M38 42 C43 46 47 51 49 55" stroke="#DCE3AE" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7"/>
</svg></div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [size, file] of [
  [192, "public/icon-192.png"],
  [512, "public/icon-512.png"],
  [180, "public/apple-touch-icon.png"],
]) {
  await page.setContent(svg(size));
  await page.locator("#icon").screenshot({ path: file });
  console.log(file);
}
await browser.close();
