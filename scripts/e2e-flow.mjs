/**
 * 端到端真实用户旅程（真实 LLM，无 mock）：
 * 新用户小明发种子 → 信使匹配投递 → 候选 persona 表达意向 → 小明选人成局
 * → 双人聊天 → 推进 → 整理约定 → 双确认 → 双完成 → 双回忆 → 共同回忆生成 → 再约一次
 * 运行：先 pnpm dev（另一终端），再 node scripts/e2e-flow.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

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
  get(p) {
    return this.req("GET", p);
  }
  post(p, b) {
    return this.req("POST", p, b ?? {});
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (s) => console.log(`\x1b[32m✔\x1b[0m ${s}`);

async function main() {
  const t0 = Date.now();
  const owner = new Client("owner");

  // 1. 创建新用户
  await owner.post("/api/auth", {
    name: "测试小明",
    bio: "想找人一起周末爬山",
    emoji: "🧗",
  });
  log("小明已创建并登录");

  // 2. 澄清对话（真实 AI 多轮）
  const history = [];
  const say = async (text) => {
    history.push({ role: "user", content: text });
    const step = await owner.post("/api/clarify", { history });
    history.push({ role: "assistant", content: step.reply });
    console.log(`  🐦 小绿: ${step.reply}`);
    return step;
  };
  let step = await say("这周六想找个人一起去爬山，学校附近就行");
  let guard = 0;
  const answers = [
    "就周六早上八点半出发，下午回来，两个人就够了",
    "希望对方当天能全程参加，路线可以商量，新手也没关系",
    "没有别的要求了，就这样吧",
    "都可以，你帮我定就好",
    "嗯嗯没问题，就这样",
    "可以，就按这个来",
  ];
  while (!step.ready && guard < answers.length) {
    step = await say(answers[guard]);
    guard++;
  }
  if (!step.ready || !step.card) throw new Error("澄清未能收敛出种子卡");
  log(`种子卡生成：${step.card.title}`);

  // 3. 发布种子（用户确认）
  const { seedId } = await owner.post("/api/seeds", { card: step.card });
  log(`种子已发布 ${seedId}，信使鸟出发匹配…`);

  // 4. 等待匹配管线完成（真实 LLM 评估 + A2A，最长 3 分钟）
  let seedDetail;
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    seedDetail = await owner.get(`/api/seeds/${seedId}`);
    if (seedDetail.seed.status === "delivered") break;
  }
  if (seedDetail.seed.status !== "delivered") throw new Error("匹配超时");
  log(`匹配完成，投递 ${seedDetail.intents.length} 位候选人`);
  if (seedDetail.intents.length === 0) throw new Error("没有任何投递");

  // 5. 候选人（取第一位）登录并回应
  const candidateInfo = seedDetail.intents[0].candidate;
  const cand = new Client("candidate");
  await cand.post("/api/auth", { userId: candidateInfo.id });
  const mailbox = await cand.get("/api/mailbox");
  const invite = mailbox.items.find((m) => m.seedTitle === step.card.title && m.status === "delivered");
  if (!invite) throw new Error("候选人信箱没有收到投递");
  const inviteDetail = await cand.get(`/api/invites/${invite.id}`);
  if (!inviteDetail.match.a2a?.turns?.length) throw new Error("A2A 对话缺失");
  log(`候选人 ${candidateInfo.name} 收到种子，A2A ${inviteDetail.match.a2a.turns.length} 轮，理由: ${inviteDetail.match.reasons.map((r) => r.text).join(" / ")}`);
  await cand.post(`/api/invites/${invite.id}`, { interested: true, note: "正好周六有空，带你走条好路线" });
  log("候选人已表达意向");

  // 6. 发起人选人成局（含真实 AI 破冰生成）
  const intents = (await owner.get(`/api/seeds/${seedId}`)).intents;
  const interested = intents.find((i) => i.status === "interested");
  const { roomId } = await owner.post(`/api/seeds/${seedId}/choose`, { matchId: interested.matchId });
  log(`成局！房间 ${roomId}`);

  // 7. 房间：破冰验证 + 双人聊天
  let room = await owner.get(`/api/rooms/${roomId}`);
  if (!room.room.icebreak?.message) throw new Error("破冰消息缺失");
  if (room.messages.filter((m) => m.kind === "ai").length !== 1) throw new Error("破冰应恰好一条 AI 消息");
  log(`破冰: ${room.room.icebreak.message}`);
  log(`快捷回复: ${room.room.icebreak.quickReplies.join(" | ")}`);

  await owner.post(`/api/rooms/${roomId}/messages`, { content: "哈喽！周六八点半校北门集合方便吗？" });
  await cand.post(`/api/rooms/${roomId}/messages`, { content: "可以！我建议走老和山轻松路线，两小时到顶" });
  await owner.post(`/api/rooms/${roomId}/messages`, { content: "好呀就老和山，我带点水果上去分" });
  room = await owner.get(`/api/rooms/${roomId}`);
  if (room.room.stage !== "leafing") throw new Error(`双方开口后应 leafing，实际 ${room.room.stage}`);
  log("双方真实交流，植物长叶 🌿");

  // 8. 推进（真实 AI）
  await owner.post(`/api/rooms/${roomId}/nudge`);
  room = await owner.get(`/api/rooms/${roomId}`);
  const aiMsgs = room.messages.filter((m) => m.kind === "ai");
  log(`推进产生 AI 协助: ${aiMsgs[aiMsgs.length - 1].content.slice(0, 60)}…`);

  // 9. 整理约定（真实 AI）→ 双确认 → 花苞
  await owner.post(`/api/rooms/${roomId}/pact`, { action: "draft" });
  room = await owner.get(`/api/rooms/${roomId}`);
  if (!room.pact) throw new Error("约定草稿缺失");
  log(`约定草稿: ${JSON.stringify(room.pact.content)}`);
  await owner.post(`/api/rooms/${roomId}/pact`, { action: "confirm" });
  await cand.post(`/api/rooms/${roomId}/pact`, { action: "confirm" });
  room = await owner.get(`/api/rooms/${roomId}`);
  if (room.pact.status !== "confirmed") throw new Error("约定未确认");
  if (room.room.stage !== "bud") throw new Error(`应花苞，实际 ${room.room.stage}`);
  log("行动约定双确认，花苞 🌷");

  // 10. 双完成 → 开花
  await owner.post(`/api/rooms/${roomId}/complete`);
  room = await owner.get(`/api/rooms/${roomId}`);
  if (room.room.stage === "bloom") throw new Error("单方确认不应开花");
  await cand.post(`/api/rooms/${roomId}/complete`);
  room = await owner.get(`/api/rooms/${roomId}`);
  if (room.room.stage !== "bloom") throw new Error("双确认后应开花");
  log("行动完成，开花 🌸");

  // 11. 双回忆（都愿意再组队）→ 共同回忆生成
  await owner.post(`/api/rooms/${roomId}/memory`, { willRejoin: true, text: "山顶的风超舒服，下次再来" });
  await cand.post(`/api/rooms/${roomId}/memory`, { willRejoin: true, text: "带新人爬山很开心" });
  room = await owner.get(`/api/rooms/${roomId}`);
  if (!room.memoryId) throw new Error("共同回忆未生成");
  const forest = await owner.get("/api/forest");
  if (!forest.memories.find((m) => m.id === room.memoryId)) throw new Error("森林中看不到回忆");
  const mem = await owner.get(`/api/memories/${room.memoryId}`);
  log(`共同回忆生成: ${mem.memory.summary ?? mem.memory.title}`);

  // 12. 再约一次（定向投递）
  const { seedId: newSeedId } = await owner.post(`/api/memories/${room.memoryId}/reseed`, {
    whenText: "下周六早上",
  });
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const s = await owner.get(`/api/seeds/${newSeedId}`);
    if (s.seed.status === "delivered") break;
  }
  const candMailbox2 = await cand.get("/api/mailbox");
  const direct = candMailbox2.items.find((m) => m.status === "delivered");
  if (!direct) throw new Error("再约一次未送达对方信箱");
  log(`再约一次已送达 ${candidateInfo.name} 的信箱 🌰`);

  console.log(`\n🎉 全链路闭环通过（${((Date.now() - t0) / 1000).toFixed(0)}s）`);
}

main().catch((e) => {
  console.error("\x1b[31m✘\x1b[0m", e.message);
  process.exit(1);
});
