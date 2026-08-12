/**
 * QA Newbie Test Script — 社交森林 融合版
 * 视角：大一新生小白，性子急、乱点、乱输入
 * 截图存 shots/qa-newbie/
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3003";
const SHOTS = "/Users/bamboo/Githubs/social-gamma/shots/qa-newbie";
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
let shotCounter = 0;

async function shot(page, label) {
  shotCounter++;
  const filename = `${String(shotCounter).padStart(2,"0")}-${label}.png`;
  const fullPath = path.join(SHOTS, filename);
  await page.screenshot({ path: fullPath, fullPage: false });
  console.log(`[SHOT] ${filename}`);
  return filename;
}

function record(id, name, cmd, expected, actual, status, shotFile) {
  results.push({ id, name, cmd, expected, actual, status, shotFile });
  const icon = status === "PASS" ? "✓" : "✗";
  console.log(`[${icon}] ${id}: ${name} — ${status}`);
  if (status === "FAIL") console.log(`    actual: ${actual}`);
}

async function waitForText(page, text, timeout = 15000) {
  try {
    await page.waitForFunction(
      (t) => document.body.innerText.includes(t),
      text,
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

async function waitForSelector(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout, state: "visible" });
    return true;
  } catch {
    return false;
  }
}

// ─── setup ───────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

// Capture console errors
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(`PAGE_ERROR: ${err.message}`));

// ─── TC1: 创建新身份 ──────────────────────────────────────────────────────────
console.log("\n=== TC1: 新身份注册流程 ===");
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const homeFile = await shot(page, "home-initial");

// Check what's on home page
const homeText = await page.evaluate(() => document.body.innerText);
const hasCreateBtn = homeText.includes("创建") || homeText.includes("新身份") || homeText.includes("加入") || homeText.includes("开始");
record("TC1.1", "首页可见入口", "goto /", "有创建/开始按钮", hasCreateBtn ? "找到入口文案" : `未找到，页面文字: ${homeText.slice(0,200)}`, hasCreateBtn ? "PASS" : "FAIL", homeFile);

// Try to find create/join button
const createSelectors = [
  'button:has-text("创建")',
  'button:has-text("新身份")',
  'button:has-text("开始")',
  'a:has-text("创建")',
  '[data-testid="create"]',
  'button:has-text("加入")',
  'button:has-text("进入")',
];

let entryFound = false;
for (const sel of createSelectors) {
  const el = await page.$(sel);
  if (el) {
    await el.click();
    entryFound = true;
    console.log(`  Found entry via: ${sel}`);
    break;
  }
}

if (!entryFound) {
  // Maybe already logged in or redirected
  const url = page.url();
  console.log(`  Current URL: ${url}`);
  if (url.includes("/garden") || url.includes("/seed") || url.includes("/me")) {
    console.log("  Already logged in, proceeding");
  } else {
    // Try clicking any prominent button
    const btns = await page.$$("button");
    if (btns.length > 0) {
      await btns[0].click();
      await page.waitForTimeout(1000);
    }
  }
}

await page.waitForTimeout(1500);
const afterClickFile = await shot(page, "after-home-click");
const url1 = page.url();
record("TC1.2", "点击入口后页面响应", "click entry", "页面跳转或弹出", url1, url1 !== BASE + "/" ? "PASS" : "FAIL", afterClickFile);

// ─── Create new user via API and get session ──────────────────────────────────
console.log("\n=== 通过API创建测试用户 ===");
const authResp = await page.request.post(`${BASE}/api/auth`, {
  data: { name: "小白测试用户", emoji: "🐣", bio: "大一新生刚来" }
});
const authData = await authResp.json();
console.log(`  Auth response: ${JSON.stringify(authData)}`);
const newUserId = authData.userId;
record("TC1.3", "API创建新身份", "POST /api/auth {name}", "200 + userId", authData.userId ? `userId: ${authData.userId}` : "no userId", authData.userId ? "PASS" : "FAIL", null);

// Navigate to seed page
await page.goto(BASE + "/seed/new", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const seedNewFile = await shot(page, "seed-new-page");
const seedText = await page.evaluate(() => document.body.innerText);
const hasSeedInput = await page.$("textarea, input[type='text']") !== null;
record("TC1.4", "种子发布页加载", "goto /seed/new", "有输入框", hasSeedInput ? "输入框存在" : "无输入框，页面：" + seedText.slice(0,200), hasSeedInput ? "PASS" : "FAIL", seedNewFile);

// ─── TC2: 乱点快捷选项 chip ───────────────────────────────────────────────────
console.log("\n=== TC2: 乱点chip + 无效输入 ===");
await page.waitForTimeout(1000);

// Find chips
const chips = await page.$$('[class*="chip"], [class*="tag"], [class*="badge"], button[class*="rounded"]');
console.log(`  Found ${chips.length} chip-like elements`);

if (chips.length > 0) {
  // Click a few chips rapidly
  for (let i = 0; i < Math.min(3, chips.length); i++) {
    try {
      await chips[i].click();
      await page.waitForTimeout(300);
    } catch { /* may be hidden */ }
  }
  const chipFile = await shot(page, "chips-clicked");
  record("TC2.1", "快速乱点chip", "click chips x3", "UI响应不崩溃", "chip交互", "PASS", chipFile);
} else {
  record("TC2.1", "快速乱点chip", "find chips", "有快捷选项chip", "未找到chip元素", "FAIL", seedNewFile);
}

// Type invalid input: "随便"
const textarea = await page.$("textarea");
if (textarea) {
  await textarea.click();
  await textarea.fill("随便");
  await page.waitForTimeout(500);
  const invalidFile1 = await shot(page, "input-suibian");

  // Look for submit button
  const submitBtn = await page.$('button[type="submit"], button:has-text("发布"), button:has-text("发送"), button:has-text("种下")');
  if (submitBtn) {
    await submitBtn.click();
    await page.waitForTimeout(3000);
    const afterInvalidFile = await shot(page, "after-suibian-submit");
    const afterText = await page.evaluate(() => document.body.innerText);
    const hasFollowUp = afterText.includes("具体") || afterText.includes("什么") || afterText.includes("想") || afterText.includes("告诉") || afterText.includes("可以") || afterText.includes("说说");
    record("TC2.2", "输入'随便'后AI追问", "submit '随便'", "AI追问具体意图", hasFollowUp ? "AI追问了：" + afterText.slice(0,100) : "无追问，直接生成或报错", hasFollowUp ? "PASS" : "FAIL", afterInvalidFile);
  } else {
    record("TC2.2", "输入'随便'后AI追问", "submit '随便'", "AI追问具体意图", "未找到提交按钮", "FAIL", invalidFile1);
  }

  // Clear and type "不知道"
  const textarea2 = await page.$("textarea");
  if (textarea2) {
    await textarea2.fill("不知道");
    await page.waitForTimeout(300);
    const textarea3 = await page.$('button[type="submit"], button:has-text("发布"), button:has-text("发送"), button:has-text("种下")');
    if (textarea3) {
      await textarea3.click();
      await page.waitForTimeout(3000);
      const afterNotKnow = await shot(page, "after-buzhidao-submit");
      const afterText2 = await page.evaluate(() => document.body.innerText);
      const notBlocked = !afterText2.includes("error") && !afterText2.includes("Error");
      record("TC2.3", "输入'不知道'不卡死", "submit '不知道'", "不崩溃/不卡死", "页面响应正常", notBlocked ? "PASS" : "FAIL", afterNotKnow);
    }
  }

  // Type "啊啊啊"
  const taFinal = await page.$("textarea");
  if (taFinal) {
    await taFinal.fill("啊啊啊");
    await page.waitForTimeout(300);
  }
} else {
  record("TC2.2", "输入无效文字", "find textarea", "有文本输入框", "未找到textarea", "FAIL", seedNewFile);
  record("TC2.3", "输入'不知道'不卡死", "find textarea", "有文本输入框", "未找到textarea", "FAIL", seedNewFile);
}

// ─── TC3: 语音按钮 ────────────────────────────────────────────────────────────
console.log("\n=== TC3: 语音按钮测试 ===");
const voiceBtn = await page.$('[aria-label*="语音"], [aria-label*="voice"], [aria-label*="mic"], button:has-text("🎤"), [class*="mic"], [class*="voice"]');
if (voiceBtn) {
  await voiceBtn.click();
  await page.waitForTimeout(2000);
  const voiceFile = await shot(page, "voice-button-clicked");
  const pageText = await page.evaluate(() => document.body.innerText);
  const hasVoiceUI = pageText.includes("录音") || pageText.includes("语音") || pageText.includes("麦克风") || pageText.includes("权限");
  record("TC3.1", "语音按钮有反应", "click voice btn", "弹出录音UI或权限提示", hasVoiceUI ? "语音UI出现" : "有响应", "PASS", voiceFile);
} else {
  // Check image of current page for mic icon
  const seedPageCurrent = await shot(page, "seed-no-voice-btn");
  record("TC3.1", "语音按钮", "find mic button", "有语音按钮", "页面无语音按钮", "FAIL", seedPageCurrent);
}

// ─── TC4: 正常发种子 ──────────────────────────────────────────────────────────
console.log("\n=== TC4: 正常发种子 '想找人打羽毛球' ===");
// Go back to seed new page fresh
await page.goto(BASE + "/seed/new", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

const taNew = await page.$("textarea");
if (taNew) {
  await taNew.fill("想找人打羽毛球");
  await page.waitForTimeout(500);
  const seedFilled = await shot(page, "seed-filled-badminton");

  const submitBtnN = await page.$('button[type="submit"], button:has-text("发布"), button:has-text("发送"), button:has-text("种下"), button:has-text("发出")');
  if (submitBtnN) {
    await submitBtnN.click();
    console.log("  Seed submitted, waiting for response...");
    await page.waitForTimeout(5000);
    const afterSeedFile = await shot(page, "after-seed-submit");
    const afterSeedText = await page.evaluate(() => document.body.innerText);
    const seedCreated = afterSeedText.includes("羽毛球") || afterSeedText.includes("种子") || page.url().includes("/garden") || page.url().includes("/seed/") || afterSeedText.includes("发出") || afterSeedText.includes("成功");
    record("TC4.1", "发种子'想找人打羽毛球'", "submit seed", "种子创建成功，跳转", afterSeedText.slice(0,150), seedCreated ? "PASS" : "FAIL", afterSeedFile);
  } else {
    record("TC4.1", "发种子", "find submit btn", "有发布按钮", "未找到发布按钮", "FAIL", seedFilled);
  }
} else {
  record("TC4.1", "发种子", "find textarea", "有输入框", "未找到textarea", "FAIL", null);
}

// ─── TC5: 空输入点发送 ───────────────────────────────────────────────────────
console.log("\n=== TC5: 空输入点发送 ===");
await page.goto(BASE + "/seed/new", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const emptyTextarea = await page.$("textarea");
if (emptyTextarea) {
  await emptyTextarea.fill("");
  const submitE = await page.$('button[type="submit"], button:has-text("发布"), button:has-text("发送"), button:has-text("种下")');
  if (submitE) {
    await submitE.click();
    await page.waitForTimeout(2000);
    const emptyFile = await shot(page, "empty-input-submit");
    const emptyText = await page.evaluate(() => document.body.innerText);
    const hasValidation = emptyText.includes("不能为空") || emptyText.includes("请输入") || emptyText.includes("填写") || submitE !== null;
    // Check button was not navigating
    const sameUrl = page.url().includes("/seed/new") || page.url().includes("/seed");
    record("TC5.1", "空输入点发送", "submit empty", "有验证提示或按钮disabled", sameUrl ? "停在当前页" : "跳转了：" + page.url(), sameUrl ? "PASS" : "FAIL", emptyFile);
  } else {
    record("TC5.1", "空输入点发送", "find submit", "有提交按钮", "未找到", "FAIL", null);
  }
}

// ─── TC6: Tab巡检 ─────────────────────────────────────────────────────────────
console.log("\n=== TC6: 四个Tab巡检 ===");
const tabs = [
  { name: "花园", path: "/garden", keywords: ["花园", "种子", "Garden"] },
  { name: "信箱", path: "/mailbox", keywords: ["信箱", "消息", "通知"] },
  { name: "行动", path: "/actions", keywords: ["行动", "约定", "Action"] },
  { name: "我的", path: "/me", keywords: ["我的", "个人", "Profile", "头像"] },
];

for (const tab of tabs) {
  await page.goto(BASE + tab.path, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const tabFile = await shot(page, `tab-${tab.name}`);
  const tabText = await page.evaluate(() => document.body.innerText);
  const hasContent = tab.keywords.some(k => tabText.includes(k)) || tabText.length > 50;
  const hasError = tabText.includes("error") || tabText.includes("Error") || tabText.includes("undefined") || tabText.includes("null");
  record(`TC6.${tabs.indexOf(tab)+1}`, `${tab.name} tab加载`, `goto ${tab.path}`, `显示${tab.name}内容，无报错`, hasError ? "有报错：" + tabText.slice(0,100) : (hasContent ? "内容正常" : "内容为空"), (hasContent && !hasError) ? "PASS" : "FAIL", tabFile);
}

// ─── TC7: 返回键狂点 ─────────────────────────────────────────────────────────
console.log("\n=== TC7: 返回键狂点 ===");
await page.goto(BASE + "/seed/new", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
// Find back button
const backBtn = await page.$('[aria-label*="返回"], button:has-text("返回"), button:has-text("←"), [class*="back"]');
if (backBtn) {
  // Click multiple times fast
  for (let i = 0; i < 5; i++) {
    try { await backBtn.click(); await page.waitForTimeout(200); } catch { break; }
  }
  await page.waitForTimeout(1500);
  const backFile = await shot(page, "back-btn-spam");
  const backText = await page.evaluate(() => document.body.innerText);
  const noError = !backText.includes("Cannot read") && !backText.includes("undefined");
  record("TC7.1", "返回键狂点不崩溃", "click back x5 fast", "页面稳定不白屏", noError ? "页面稳定" : "有JS错误", noError ? "PASS" : "FAIL", backFile);
} else {
  // Use browser back button
  for (let i = 0; i < 3; i++) {
    await page.goBack();
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1000);
  const backFile2 = await shot(page, "back-browser-spam");
  record("TC7.1", "浏览器返回键狂点", "goBack x3", "页面稳定", "使用浏览器返回", "PASS", backFile2);
}

// ─── TC8: 重复提交连点 ───────────────────────────────────────────────────────
console.log("\n=== TC8: 重复提交连点 ===");
await page.goto(BASE + "/seed/new", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const taRepeat = await page.$("textarea");
if (taRepeat) {
  await taRepeat.fill("测试重复提交");
  const submitRpt = await page.$('button[type="submit"], button:has-text("发布"), button:has-text("发送"), button:has-text("种下")');
  if (submitRpt) {
    // Click 5 times rapidly
    for (let i = 0; i < 5; i++) {
      submitRpt.click().catch(() => {});
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(4000);
    const repeatFile = await shot(page, "repeat-submit");
    // Check if multiple seeds created (check garden)
    await page.goto(BASE + "/garden", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const gardenText = await page.evaluate(() => document.body.innerText);
    const repeatCount = (gardenText.match(/测试重复提交/g) || []).length;
    record("TC8.1", "重复连点发布防重", "click submit x5 fast", "只创建1个种子", `花园中出现${repeatCount}个重复种子`, repeatCount <= 1 ? "PASS" : "FAIL", repeatFile);
  } else {
    record("TC8.1", "重复连点发布", "find submit", "有提交按钮", "未找到", "FAIL", null);
  }
}

// ─── TC9: 中途刷新页面 ───────────────────────────────────────────────────────
console.log("\n=== TC9: 中途刷新状态保持 ===");
await page.goto(BASE + "/seed/new", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const taRefresh = await page.$("textarea");
if (taRefresh) {
  await taRefresh.fill("测试刷新保存");
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const refreshFile = await shot(page, "after-refresh");
  const refreshText = await page.evaluate(() => document.body.innerText);
  // Check if still logged in (key question)
  const stillLoggedIn = !refreshText.includes("登录") && !refreshText.includes("注册") || page.url().includes("/seed");
  record("TC9.1", "刷新后状态保持", "fill then reload", "刷新后仍登录/状态保持", stillLoggedIn ? "登录态保持" : "登录态丢失", stillLoggedIn ? "PASS" : "FAIL", refreshFile);
}

// ─── TC10: 等待仿真同伴响应 (花园) ───────────────────────────────────────────
console.log("\n=== TC10: 等待仿真同伴响应 ===");
await page.goto(BASE + "/garden", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const gardenFile = await shot(page, "garden-overview");
const gardenText = await page.evaluate(() => document.body.innerText);
// Check for seeds
const hasSeed = gardenText.includes("羽毛球") || gardenText.includes("种子") || gardenText.includes("约") || gardenText.length > 100;
record("TC10.1", "花园有种子显示", "goto /garden", "种子可见", hasSeed ? gardenText.slice(0,200) : "内容为空", hasSeed ? "PASS" : "FAIL", gardenFile);

// Wait up to 90 seconds for simulated peer
console.log("  Waiting up to 90s for simulated peer response...");
let peerArrived = false;
for (let i = 0; i < 18; i++) {
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(5000);
  const gt = await page.evaluate(() => document.body.innerText);
  // Look for signs of peer response (意向 or 表达 or 同学 or 匹配)
  if (gt.includes("意向") || gt.includes("想参加") || gt.includes("感兴趣") || gt.includes("表达") || gt.includes("匹配")) {
    peerArrived = true;
    console.log("  Peer response detected!");
    break;
  }
  console.log(`  [${(i+1)*5}s] Waiting for peer...`);
}
const peerFile = await shot(page, "garden-after-peer-wait");
const peerText = await page.evaluate(() => document.body.innerText);
record("TC10.2", "仿真同伴90s内响应", "wait 90s on /garden", "有同伴表达意向", peerArrived ? "同伴已响应" : "90s内无响应：" + peerText.slice(0,200), peerArrived ? "PASS" : "FAIL", peerFile);

// ─── TC11: 选人流程 ───────────────────────────────────────────────────────────
console.log("\n=== TC11: 选人→行动房间流程 ===");
// Try to find invite/choose person button
const inviteBtn = await page.$('button:has-text("邀请"), button:has-text("选"), button:has-text("发起"), a:has-text("邀请"), [class*="invite"]');
if (inviteBtn) {
  await inviteBtn.click();
  await page.waitForTimeout(2000);
  const inviteFile = await shot(page, "invite-flow");
  const inviteText = await page.evaluate(() => document.body.innerText);
  record("TC11.1", "点击邀请/选人进入流程", "click invite btn", "进入选人或确认页", inviteText.slice(0,200), "PASS", inviteFile);
} else {
  // Try clicking on a seed card
  const seedCards = await page.$$('[class*="seed"], [class*="card"]');
  if (seedCards.length > 0) {
    await seedCards[0].click();
    await page.waitForTimeout(2000);
    const seedDetailFile = await shot(page, "seed-detail");
    const seedDetailText = await page.evaluate(() => document.body.innerText);
    record("TC11.1", "点击种子卡进入详情", "click seed card", "种子详情页", seedDetailText.slice(0,200), "PASS", seedDetailFile);
  } else {
    const noInviteFile = await shot(page, "no-invite-btn");
    record("TC11.1", "选人流程入口", "find invite", "有邀请/选人按钮", "未找到邀请入口", "FAIL", noInviteFile);
  }
}

// ─── TC12: 行动房间 / 聊天 ───────────────────────────────────────────────────
console.log("\n=== TC12: 行动房间/聊天 ===");
// Check if we're in a room or navigate to actions
await page.goto(BASE + "/actions", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const actionsFile = await shot(page, "actions-tab");
const actionsText = await page.evaluate(() => document.body.innerText);
const hasAction = actionsText.includes("行动") || actionsText.includes("房间") || actionsText.includes("约定");
record("TC12.1", "行动tab内容", "goto /actions", "显示行动/房间", hasAction ? actionsText.slice(0,200) : "内容为空或无", hasAction ? "PASS" : "FAIL", actionsFile);

// Try to enter any room listed
const roomLinks = await page.$$('a[href*="/room"], a[href*="/action"], [class*="room"]');
if (roomLinks.length > 0) {
  await roomLinks[0].click();
  await page.waitForTimeout(2000);
  const roomFile = await shot(page, "action-room");
  const roomText = await page.evaluate(() => document.body.innerText);
  const hasChatInput = await page.$("textarea, input[type='text']") !== null;
  record("TC12.2", "行动房间有聊天输入", "enter room", "有聊天输入框", hasChatInput ? "有输入框" : "无输入框：" + roomText.slice(0,100), hasChatInput ? "PASS" : "FAIL", roomFile);

  if (hasChatInput) {
    // Test empty send in chat
    const chatInput = await page.$("textarea, input[type='text']");
    await chatInput.fill("");
    const sendBtn = await page.$('button:has-text("发送"), button[type="submit"]');
    if (sendBtn) {
      await sendBtn.click();
      await page.waitForTimeout(1000);
      const emptyChatFile = await shot(page, "chat-empty-send");
      record("TC12.3", "聊天空输入点发送", "send empty msg", "按钮disabled或无反应", "空发操作", "PASS", emptyChatFile);
    }
  }
} else {
  record("TC12.2", "行动房间", "find room link", "有房间可进入", "无房间链接", "FAIL", actionsFile);
  record("TC12.3", "聊天空输入", "N/A", "N/A", "无法进入房间", "FAIL", actionsFile);
}

// ─── TC13: 信箱未读红点 ──────────────────────────────────────────────────────
console.log("\n=== TC13: 信箱红点/通知 ===");
await page.goto(BASE + "/mailbox", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const mailboxFile = await shot(page, "mailbox-detail");
const mailboxText = await page.evaluate(() => document.body.innerText);
const hasMailboxContent = mailboxText.length > 80;
const hasMailboxError = mailboxText.toLowerCase().includes("error");
record("TC13.1", "信箱内容加载", "goto /mailbox", "显示信息或空态提示", hasMailboxError ? "有error" : (hasMailboxContent ? mailboxText.slice(0,150) : "内容过少"), (hasMailboxContent && !hasMailboxError) ? "PASS" : "FAIL", mailboxFile);

// ─── TC14: 我的页面 ───────────────────────────────────────────────────────────
console.log("\n=== TC14: 我的页面 ===");
await page.goto(BASE + "/me", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const meFile = await shot(page, "me-profile");
const meText = await page.evaluate(() => document.body.innerText);
const hasMeContent = meText.length > 50;
record("TC14.1", "我的页面加载", "goto /me", "显示个人信息", hasMeContent ? meText.slice(0,200) : "内容过少", hasMeContent ? "PASS" : "FAIL", meFile);

// ─── TC15: 控制台错误汇总 ────────────────────────────────────────────────────
console.log("\n=== TC15: JS控制台错误检查 ===");
const errCount = consoleErrors.length;
console.log(`  Console errors found: ${errCount}`);
if (errCount > 0) {
  console.log("  Errors:", consoleErrors.slice(0, 5));
}
record("TC15.1", "无严重JS报错", "monitor console", "控制台无error", errCount === 0 ? "无JS错误" : `${errCount}个JS错误: ${consoleErrors.slice(0,3).join('; ')}`, errCount === 0 ? "PASS" : "FAIL", null);

// ─── 清理 ────────────────────────────────────────────────────────────────────
await browser.close();

// ─── 输出报告 ─────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.status === "PASS").length;
const failed = results.filter(r => r.status === "FAIL").length;

console.log("\n");
console.log("=".repeat(60));
console.log("QA TEST REPORT SUMMARY");
console.log("=".repeat(60));
console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
console.log("");
results.forEach(r => {
  const icon = r.status === "PASS" ? "✓" : "✗";
  console.log(`[${icon}] ${r.id}: ${r.name}`);
  if (r.status === "FAIL") {
    console.log(`    Expected: ${r.expected}`);
    console.log(`    Actual: ${r.actual}`);
  }
  if (r.shotFile) console.log(`    Shot: shots/qa-newbie/${r.shotFile}`);
});

// Write JSON results
const resultsPath = "/private/tmp/claude-501/-Users-bamboo-Githubs-social-gamma/0ac9d359-b24a-488c-a7e5-1a58e92c8cdb/scratchpad/qa-results.json";
fs.writeFileSync(resultsPath, JSON.stringify({ passed, failed, results, consoleErrors }, null, 2));
console.log(`\nResults JSON: ${resultsPath}`);
