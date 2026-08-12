/**
 * 群体行动 1对N 端到端流程（真实 LLM，无 mock）：
 * 新用户发一颗「3-4人」种子 → 两位候选各 interested
 * → choose matchIds=[两位] → room.members=3、破冰存在
 * → 三人各发消息 → stage=leafing
 * → 三人各确认约定 → bud
 * → 三人各 complete → bloom
 * → 三人各提交回忆（全 true）→ memories 生成
 *
 * 运行：先 pnpm dev（另一终端，端口 3003），再 node scripts/group-e2e.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3003";

class Client {
  constructor(label) {
    this.label = label;
    this.cookie = "";
  }
  async req(method, path, body) {
    const r = await fetch(BASE + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = r.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    let data = null;
    try {
      data = await r.json();
    } catch {}
    if (!r.ok) {
      throw new Error(`${this.label} ${method} ${path} → ${r.status} ${JSON.stringify(data)}`);
    }
    return data;
  }
  get(p) { return this.req("GET", p); }
  post(p, b) { return this.req("POST", p, b ?? {}); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (s) => console.log(`\x1b[32m✔\x1b[0m ${s}`);

async function main() {
  const t0 = Date.now();

  // ──────────────────────────────────────────────────────
  // 1. 创建发起人（群体活动，groupSize=3-4人）
  // ──────────────────────────────────────────────────────
  const owner = new Client("owner");
  await owner.post("/api/auth", {
    name: "群测小明",
    bio: "想找人一起去露营，最好3-4人一组",
    emoji: "⛺",
  });
  log("发起人小明已创建并登录");

  // 直接 POST /api/seeds，绕过澄清流程（构造 card）
  const card = {
    title: "周末露营",
    what: "去学校附近的山上露营，3-4人一组，享受户外",
    whenText: "本周六下午到周日上午",
    whereText: "学校附近山区",
    groupSize: "3-4人",
    requirements: {
      must: ["能参加整晚活动", "自带睡袋"],
      flexible: ["路线可以商量", "新手也欢迎"],
    },
    tags: ["户外", "露营", "自然"],
  };
  const { seedId } = await owner.post("/api/seeds", { card });
  log(`种子已发布 ${seedId}，groupSize=3-4人，信使鸟匹配中…`);

  // ──────────────────────────────────────────────────────
  // 2. 等待投递完成（最长 3 分钟）
  // ──────────────────────────────────────────────────────
  let seedDetail;
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    seedDetail = await owner.get(`/api/seeds/${seedId}`);
    if (seedDetail.seed.status === "delivered") break;
  }
  if (seedDetail.seed.status !== "delivered") throw new Error("匹配超时");
  log(`匹配完成，投递 ${seedDetail.intents.length} 位候选人`);
  if (seedDetail.intents.length < 2) throw new Error(`候选人不足 2 位（实际 ${seedDetail.intents.length}），无法测试群体组队`);

  // ──────────────────────────────────────────────────────
  // 3. 取前两位候选，各自表达意向
  // ──────────────────────────────────────────────────────
  const cand1Info = seedDetail.intents[0].candidate;
  const cand2Info = seedDetail.intents[1].candidate;

  const cand1 = new Client("cand1");
  const cand2 = new Client("cand2");

  // 候选 1
  await cand1.post("/api/auth", { userId: cand1Info.id });
  const mailbox1 = await cand1.get("/api/mailbox");
  const invite1 = mailbox1.items.find((m) => m.seedTitle === card.title && m.status === "delivered");
  if (!invite1) throw new Error("候选人1信箱没有收到投递");
  await cand1.post(`/api/invites/${invite1.id}`, { interested: true, note: "露营超棒！我有帐篷" });
  log(`候选人 ${cand1Info.name} 已表达意向`);

  // 候选 2
  await cand2.post("/api/auth", { userId: cand2Info.id });
  const mailbox2 = await cand2.get("/api/mailbox");
  const invite2 = mailbox2.items.find((m) => m.seedTitle === card.title && m.status === "delivered");
  if (!invite2) throw new Error("候选人2信箱没有收到投递");
  await cand2.post(`/api/invites/${invite2.id}`, { interested: true, note: "可以！我带炉具" });
  log(`候选人 ${cand2Info.name} 已表达意向`);

  // ──────────────────────────────────────────────────────
  // 4. 发起人多选 → 成局
  // ──────────────────────────────────────────────────────
  const freshDetail = await owner.get(`/api/seeds/${seedId}`);
  const interestedMatches = freshDetail.intents.filter((i) => i.status === "interested");
  if (interestedMatches.length < 2) throw new Error("interested 不足 2 位");
  const matchIds = interestedMatches.slice(0, 2).map((i) => i.matchId);
  log(`发起人选择 matchIds=${JSON.stringify(matchIds)}，组建 3 人队`);

  const { roomId } = await owner.post(`/api/seeds/${seedId}/choose`, { matchIds });
  log(`成局！群体房间 ${roomId}`);

  // ──────────────────────────────────────────────────────
  // 5. 验证 room.members=3、破冰存在
  // ──────────────────────────────────────────────────────
  let room = await owner.get(`/api/rooms/${roomId}`);
  if (!room.members || room.members.length !== 3) {
    throw new Error(`room.members 应为 3，实际 ${room.members?.length ?? "null"}`);
  }
  log(`room.members = ${room.members.length} ✓（${room.members.map((m) => m.name).join("、")}）`);
  if (!room.room.icebreak?.message) throw new Error("破冰消息缺失");
  log(`破冰: ${room.room.icebreak.message}`);

  // ──────────────────────────────────────────────────────
  // 6. 三人各发消息 → stage=leafing
  // ──────────────────────────────────────────────────────
  await owner.post(`/api/rooms/${roomId}/messages`, { content: "大家好！我是发起人，很期待这次露营" });
  await cand1.post(`/api/rooms/${roomId}/messages`, { content: "我来！我有两人帐篷可以共用" });
  await cand2.post(`/api/rooms/${roomId}/messages`, { content: "我带炉具，可以做热食！" });

  room = await owner.get(`/api/rooms/${roomId}`);
  if (room.room.stage !== "leafing") {
    throw new Error(`三人都发言后应为 leafing，实际 ${room.room.stage}`);
  }
  log("三人真实交流，植物长叶 🌿");

  // ──────────────────────────────────────────────────────
  // 7. 推进 + 整理约定
  // ──────────────────────────────────────────────────────
  await owner.post(`/api/rooms/${roomId}/nudge`);
  log("推进（AI 分析）");

  await owner.post(`/api/rooms/${roomId}/pact`, { action: "draft" });
  room = await owner.get(`/api/rooms/${roomId}`);
  if (!room.pact) throw new Error("约定草稿缺失");
  log(`约定草稿: ${JSON.stringify(room.pact.content)}`);

  // ──────────────────────────────────────────────────────
  // 8. 三人各确认约定 → bud
  // ──────────────────────────────────────────────────────
  await owner.post(`/api/rooms/${roomId}/pact`, { action: "confirm" });
  room = await owner.get(`/api/rooms/${roomId}`);
  if (room.pact.status === "confirmed") throw new Error("一人确认不应变 confirmed");
  log(`owner 确认后，confirmedCount=${room.pact.confirmedCount}/${room.pact.memberCount}`);

  await cand1.post(`/api/rooms/${roomId}/pact`, { action: "confirm" });
  room = await owner.get(`/api/rooms/${roomId}`);
  if (room.pact.status === "confirmed") throw new Error("两人确认（共 3 人）不应变 confirmed");
  log(`cand1 确认后，confirmedCount=${room.pact.confirmedCount}/${room.pact.memberCount}`);

  await cand2.post(`/api/rooms/${roomId}/pact`, { action: "confirm" });
  room = await owner.get(`/api/rooms/${roomId}`);
  if (room.pact.status !== "confirmed") throw new Error("三人都确认后约定应 confirmed");
  if (room.room.stage !== "bud") throw new Error(`应花苞，实际 ${room.room.stage}`);
  log("三人全部确认约定，花苞 🌷");

  // ──────────────────────────────────────────────────────
  // 9. 三人各 complete → bloom
  // ──────────────────────────────────────────────────────
  await owner.post(`/api/rooms/${roomId}/complete`);
  room = await owner.get(`/api/rooms/${roomId}`);
  if (room.room.stage === "bloom") throw new Error("一人完成不应 bloom");
  log(`owner complete，members 完成: ${room.members.filter((m) => m.completed).length}/${room.members.length}`);

  await cand1.post(`/api/rooms/${roomId}/complete`);
  room = await owner.get(`/api/rooms/${roomId}`);
  if (room.room.stage === "bloom") throw new Error("两人完成（共 3 人）不应 bloom");

  await cand2.post(`/api/rooms/${roomId}/complete`);
  room = await owner.get(`/api/rooms/${roomId}`);
  if (room.room.stage !== "bloom") throw new Error("三人完成后应 bloom");
  log("三人全部完成，植物开花 🌸");

  // ──────────────────────────────────────────────────────
  // 10. 三人各提交回忆（全 willRejoin=true）→ memories 生成
  // ──────────────────────────────────────────────────────
  await owner.post(`/api/rooms/${roomId}/memory`, { willRejoin: true, text: "露营太棒了！" });
  room = await owner.get(`/api/rooms/${roomId}`);
  if (room.memoryId) throw new Error("一人提交不应生成回忆");

  await cand1.post(`/api/rooms/${roomId}/memory`, { willRejoin: true, text: "帐篷配合超默契" });
  room = await owner.get(`/api/rooms/${roomId}`);
  if (room.memoryId) throw new Error("两人提交（共 3 人）不应生成回忆");

  await cand2.post(`/api/rooms/${roomId}/memory`, { willRejoin: true, text: "炉具用上了，热食好香" });

  // 等待 AI 生成回忆
  for (let i = 0; i < 20; i++) {
    await sleep(2000);
    room = await owner.get(`/api/rooms/${roomId}`);
    if (room.memoryId) break;
  }
  if (!room.memoryId) throw new Error("三人提交后共同回忆未生成");
  log(`共同回忆生成！memoryId=${room.memoryId}`);

  // 验证每位成员都能在 forest 中看到回忆
  for (const [client, label] of [[owner, "owner"], [cand1, "cand1"], [cand2, "cand2"]]) {
    const forest = await client.get("/api/forest");
    if (!forest.memories.find((m) => m.id === room.memoryId)) {
      throw new Error(`${label} 的森林中看不到共同回忆`);
    }
  }
  log("三人森林中均可见共同回忆 ✓");

  const mem = await owner.get(`/api/memories/${room.memoryId}`);
  log(`回忆内容: ${mem.memory.summary ?? mem.memory.title}`);

  console.log(`\n🎉 群体行动全链路闭环通过（${((Date.now() - t0) / 1000).toFixed(0)}s）`);
}

main().catch((e) => {
  console.error("\x1b[31m✘\x1b[0m", e.message);
  process.exit(1);
});
