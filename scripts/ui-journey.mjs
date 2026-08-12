/**
 * 用户侧 UI 全旅程审查（autoresearch Verify）：
 * 双浏览器上下文模拟两台手机，全部通过真实 UI 交互 + 真实 LLM。
 * 输出：PASSED n/16（机械指标），截图存 shots/journey/。
 * 运行：node scripts/ui-journey.mjs（需 dev server）
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3003";
const DIR = "shots/journey";
fs.mkdirSync(DIR, { recursive: true });

const results = [];
let stepNo = 0;

async function step(name, fn) {
  stepNo++;
  const tag = `${String(stepNo).padStart(2, "0")}-${name}`;
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✔ ${tag}`);
  } catch (e) {
    results.push({ name, ok: false, err: e.message?.slice(0, 200) });
    console.log(`✘ ${tag}: ${e.message?.slice(0, 200)}`);
  }
}

const browser = await chromium.launch();
const mk = async () => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  return { ctx, page };
};

const owner = await mk();
const cand = await mk();
const shot = (p, n) => p.screenshot({ path: `${DIR}/${n}.png` }).catch(() => {});

// ───────────────────────── 发起人侧 ─────────────────────────

await step("welcome-create", async () => {
  await owner.page.goto(`${BASE}/welcome`);
  await owner.page.getByText("创建我自己的身份").click();
  await owner.page.getByPlaceholder("昵称").fill("journey小明");
  await owner.page.getByPlaceholder("比如：想找人一起晨跑").fill("想找人一起周末爬山");
  await shot(owner.page, "01-welcome");
  await owner.page.getByText("进入我的花园").click();
  await owner.page.waitForURL("**/garden");
  await shot(owner.page, "01b-garden-empty");
});

const birdBubbles = () => owner.page.locator(".font-kai.max-w-\\[75\\%\\]");

async function saySeed(text, expectMin) {
  await owner.page.getByPlaceholder("告诉小叶你想做什么…").fill(text);
  await owner.page.getByText("发送", { exact: true }).click();
  await owner.page.waitForFunction(
    (min) => document.querySelectorAll(".font-kai.max-w-\\[75\\%\\]").length >= min,
    expectMin,
    { timeout: 60000 }
  );
}

await step("seed-chat", async () => {
  await owner.page.goto(`${BASE}/seed/new`);
  // 开场白是第 1 个鸟气泡
  await saySeed("这周六想找个人一起去爬山，学校附近，早八点半出发下午回", 2);
  await shot(owner.page, "02-clarify");
});

await step("seed-card", async () => {
  const answers = [
    "就我们两个人，希望对方全程参加，路线可以商量",
    "没有别的要求了，就这样吧",
    "都可以，你帮我定就好",
    "嗯嗯没问题，就发布吧",
  ];
  for (const a of answers) {
    const publishBtn = owner.page.getByText("发布这颗种子", { exact: false });
    if (await publishBtn.isVisible().catch(() => false)) break;
    const before = await birdBubbles().count();
    await saySeed(a, before + 1);
    // 等打字机与可能出现的卡片
    await owner.page.waitForTimeout(2500);
  }
  await owner.page.getByText("发布这颗种子", { exact: false }).waitFor({ timeout: 30000 });
  await shot(owner.page, "03-seed-card");
});

let seedPath = "";
await step("seed-publish", async () => {
  await owner.page.getByText("发布这颗种子", { exact: false }).click();
  await owner.page.waitForURL("**/seed/s_*", { timeout: 30000 });
  seedPath = new URL(owner.page.url()).pathname;
  await shot(owner.page, "04-seed-published");
});

let candidateName = "";
let seedTitle = "";
await step("matching-delivered", async () => {
  const seedId = seedPath.split("/").pop();
  // 轮询发起人种子页直到显示已投递（真实 LLM 匹配 + A2A，最长 4 分钟）
  await owner.page.waitForFunction(
    () => /已投递|有意向的同伴/.test(document.body.innerText),
    undefined,
    { timeout: 240000, polling: 2000 }
  );
  // 从 API 读取候选名单（驱动信息，交互仍走 UI）
  const data = await owner.page.evaluate(async (id) => {
    const r = await fetch(`/api/seeds/${id}`);
    return r.json();
  }, seedId);
  if (!data.intents?.length) throw new Error("无投递候选人");
  candidateName = data.intents[0].candidate.name;
  seedTitle = data.seed.title;
  await shot(owner.page, "05-matching");
});

// ───────────────────────── 候选人侧 ─────────────────────────

await step("candidate-mailbox", async () => {
  await cand.page.goto(`${BASE}/welcome`);
  await cand.page.getByText(candidateName, { exact: true }).first().click();
  await cand.page.waitForURL("**/garden");
  await cand.page.goto(`${BASE}/mailbox`);
  await cand.page.getByText(seedTitle, { exact: true }).first().waitFor({ timeout: 15000 });
  await shot(cand.page, "06-mailbox");
});

await step("invite-detail", async () => {
  await cand.page.getByText(seedTitle, { exact: true }).first().click();
  await cand.page.waitForURL("**/invite/**");
  await cand.page.getByText("信使鸟聊过了", { exact: false }).waitFor();
  await cand.page.getByText("信使鸟聊过了", { exact: false }).click(); // 展开 A2A
  await shot(cand.page, "07-invite-a2a");
});

await step("respond-interested", async () => {
  await cand.page.getByText("愿意参与", { exact: false }).click();
  await cand.page.getByPlaceholder("比如：我周末通常下午才有空～").fill("正好有空，可以带路线！");
  await cand.page.getByText("确认参与", { exact: true }).click();
  await cand.page.getByText("已表达意向", { exact: false }).waitFor({ timeout: 15000 });
  await shot(cand.page, "08-responded");
});

// ───────────────────────── 边缘路径：他人婉拒 ─────────────────────────

let otherCandidates = [];
const third = await mk();
await step("decline-other", async () => {
  const seedId = seedPath.split("/").pop();
  const data = await owner.page.evaluate(async (id) => {
    const r = await fetch(`/api/seeds/${id}`);
    return r.json();
  }, seedId);
  otherCandidates = (data.intents ?? [])
    .filter((i) => i.status === "delivered")
    .map((i) => i.candidate.name);
  if (otherCandidates.length === 0) {
    console.log("  (仅一位候选，跳过婉拒路径)");
    return;
  }
  await third.page.goto(`${BASE}/welcome`);
  await third.page.getByText(otherCandidates[0], { exact: true }).first().click();
  await third.page.waitForURL("**/garden");
  await third.page.goto(`${BASE}/mailbox`);
  await third.page.getByText(seedTitle, { exact: true }).first().click();
  await third.page.waitForURL("**/invite/**");
  await third.page.getByText("暂不感兴趣", { exact: false }).click();
  // 方案 A：婉拒后邀请页转为「你已婉拒」，且该种子从信箱主列表移除
  await third.page.getByText("你已婉拒", { exact: false }).first().waitFor({ timeout: 10000 });
  await shot(third.page, "08b-declined");
});

// ───────────────────────── 成局与房间 ─────────────────────────

let roomPath = "";
await step("owner-choose", async () => {
  await owner.page.goto(`${BASE}${seedPath}`);
  await owner.page.getByText("选择 TA 一起出发", { exact: false }).first().waitFor({ timeout: 20000 });
  await shot(owner.page, "09-intents");
  await owner.page.getByText("选择 TA 一起出发", { exact: false }).first().click();
  // 方案 A：确认弹层
  await owner.page.getByText("确认邀请", { exact: true }).waitFor({ timeout: 8000 });
  await owner.page.getByText("确认邀请", { exact: true }).click();
  await owner.page.waitForURL("**/room/**", { timeout: 90000 });
  roomPath = new URL(owner.page.url()).pathname;
  await shot(owner.page, "09b-room-created");
});

await step("closed-notice", async () => {
  // 第三位（未回应未被选）候选人的邀请应转为「种子已找到同行者」
  const remaining = otherCandidates.slice(1);
  if (remaining.length === 0) {
    console.log("  (无第三位候选，跳过落选关闭校验)");
    return;
  }
  const seedId = seedPath.split("/").pop();
  // 从发起人视角拿到该候选人的 matchId
  const detail = await owner.page.evaluate(async (id) => {
    const r = await fetch(`/api/seeds/${id}`);
    return r.json();
  }, seedId);
  const target = (detail.intents ?? []).find((i) => i.candidate.name === remaining[0]);
  if (!target) throw new Error("找不到落选候选人的投递");
  // 该候选人登录后直接打开邀请详情（关闭态种子已从信箱主列表移除，符合 Spec）
  await third.page.goto(`${BASE}/welcome`);
  await third.page.getByText(remaining[0], { exact: true }).first().click();
  await third.page.waitForURL("**/garden");
  await third.page.goto(`${BASE}/invite/${target.matchId}`);
  await third.page
    .getByText("种子已找到同行者", { exact: false })
    .first()
    .waitFor({ timeout: 15000 });
  await shot(third.page, "09c-closed-notice");
});

await step("room-handoff", async () => {
  // 方案 A：成局后是「交接提示」系统消息，第一句由真人发（不再自动破冰）
  await owner.page.getByText("已完成交接", { exact: false }).first().waitFor({ timeout: 15000 });
  await shot(owner.page, "10-handoff");
});

await step("chat-both", async () => {
  await owner.page.getByPlaceholder("说点什么…").fill("哈喽！周六八点半校北门集合可以吗？");
  await owner.page.getByText("发送", { exact: true }).click();
  await cand.page.goto(`${BASE}${roomPath}`);
  await cand.page.getByText("校北门集合", { exact: false }).waitFor({ timeout: 20000 });
  await cand.page.getByPlaceholder("说点什么…").fill("可以！走老和山轻松线，两小时到顶");
  await cand.page.getByText("发送", { exact: true }).click();
  await owner.page.getByText("老和山轻松线", { exact: false }).waitFor({ timeout: 20000 });
  await shot(owner.page, "11-chat");
});

await step("stage-leafing", async () => {
  await owner.page.getByText("长叶", { exact: false }).first().waitFor({ timeout: 20000 });
});

await step("nudge", async () => {
  const aiBefore = await owner.page.getByText("小苗", { exact: false }).count();
  await owner.page.getByText("请小苗帮忙", { exact: false }).click();
  await owner.page.waitForFunction(
    (n) => document.body.innerText.split("小苗").length - 1 > n,
    aiBefore,
    { timeout: 60000, polling: 1000 }
  );
  await shot(owner.page, "12-nudge");
});

await step("pact", async () => {
  await owner.page.getByText("整理约定", { exact: false }).click();
  await owner.page.getByText("确认约定", { exact: true }).waitFor({ timeout: 60000 });
  await shot(owner.page, "13-pact-draft");
  await owner.page.getByText("确认约定", { exact: true }).click();
  await cand.page.reload();
  await cand.page.getByText("确认约定", { exact: true }).click({ timeout: 20000 });
  await owner.page.getByText("花苞", { exact: false }).first().waitFor({ timeout: 20000 });
  await shot(owner.page, "13b-pact-confirmed");
});

await step("complete-both", async () => {
  await owner.page.getByText("我已完成", { exact: false }).click();
  await cand.page.reload();
  await cand.page.getByText("我已完成", { exact: false }).click({ timeout: 20000 });
  await owner.page.getByText("开花", { exact: false }).first().waitFor({ timeout: 20000 });
  await shot(owner.page, "14-bloom");
});

await step("memory-both", async () => {
  for (const p of [owner.page, cand.page]) {
    await p.reload();
    await p.getByText("是，还要一起", { exact: true }).click({ timeout: 20000 });
    await p.getByPlaceholder("这次行动怎么样？").fill("山顶的风超舒服！");
    await p.getByText("记录这段回忆", { exact: true }).click();
    await p.waitForTimeout(1500);
  }
  await owner.page.reload();
  await owner.page.getByText("查看共同回忆", { exact: false }).waitFor({ timeout: 20000 });
  await shot(owner.page, "15-memory-link");
});

await step("forest-and-reseed", async () => {
  await owner.page.goto(`${BASE}/forest`);
  await owner.page.locator("a[href^='/memory/']").first().click();
  await owner.page.getByText("让它结出一颗新种子", { exact: false }).waitFor();
  await shot(owner.page, "16-memory-page");
  await owner.page.getByText("让它结出一颗新种子", { exact: false }).click();
  await owner.page.getByPlaceholder("例：下周六下午").fill("下周六早上");
  await shot(owner.page, "16b-reseed-form");
  await owner.page.getByText("种下新种子", { exact: true }).click();
  await owner.page.waitForURL("**/seed/s_*", { timeout: 30000 });
});

await step("reseed-delivered", async () => {
  // 原搭子信箱应收到定向新邀请（同名种子 + 新的邀请标记）
  await cand.page.goto(`${BASE}/mailbox`);
  await cand.page.waitForFunction(
    (t) => {
      const cards = Array.from(document.querySelectorAll("a"));
      return cards.some(
        (c) => c.innerText.includes(t) && c.innerText.includes("新的邀请")
      );
    },
    seedTitle,
    { timeout: 180000, polling: 3000 }
  );
  await shot(cand.page, "18-reseed-mailbox");
});

await step("my-seeds-list", async () => {
  await owner.page.goto(`${BASE}/seed/mine`);
  await owner.page.waitForFunction(
    (t) => document.body.innerText.split(t).length - 1 >= 2,
    seedTitle,
    { timeout: 15000 }
  );
  await shot(owner.page, "19-my-seeds");
});

await browser.close();

const passed = results.filter((r) => r.ok).length;
console.log(`\nPASSED ${passed}/${results.length}`);
for (const r of results.filter((r) => !r.ok)) console.log(`  FAIL ${r.name}: ${r.err}`);
fs.appendFileSync(
  "journey-results.tsv",
  `${new Date().toISOString()}\t${passed}/${results.length}\t${results.filter((r) => !r.ok).map((r) => r.name).join(",") || "-"}\n`
);
process.exit(0);
