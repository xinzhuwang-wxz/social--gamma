/**
 * 第一视角无感旅程（仿真同伴引擎验证）：
 * 只操作发起人一侧，断言对面「有人」自动：表达意向 → 聊天回应 → 确认约定 → 完成 → 留回忆。
 * 运行：node scripts/solo-journey.mjs（dev server，SIM_MODE 未关闭）
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3003";

class Client {
  cookie = "";
  async req(method, path, body) {
    const r = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const sc = r.headers.get("set-cookie");
    if (sc) this.cookie = sc.split(";")[0];
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(data)}`);
    return data;
  }
  get(p) { return this.req("GET", p); }
  post(p, b) { return this.req("POST", p, b ?? {}); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (s) => console.log(`\x1b[32m✔\x1b[0m ${s}`);

async function waitFor(desc, fn, timeoutMs = 180000, interval = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const v = await fn();
    if (v) { log(`${desc}（${((Date.now() - t0) / 1000).toFixed(0)}s）`); return v; }
    await sleep(interval);
  }
  throw new Error(`超时: ${desc}`);
}

const me = new Client();
const t0 = Date.now();

// 1. 创建身份（全程只有我一个真人）
await me.post("/api/auth", { name: "独行小明", emoji: "🏸", bio: "想找球搭子" });
log("我已进入（唯一真人）");

// 2. 澄清并发布种子
const history = [{ role: "user", content: "周日下午想找个人在校体育馆打羽毛球，我水平一般" }];
let step = await me.post("/api/clarify", { history });
history.push({ role: "assistant", content: step.reply });
const answers = ["就两个人，下午两点到四点", "对方水平别太高就行，能一起流汗最重要", "没了，就这样"];
for (const a of answers) {
  if (step.ready && step.card) break;
  history.push({ role: "user", content: a });
  step = await me.post("/api/clarify", { history });
  history.push({ role: "assistant", content: step.reply });
}
if (!step.card) throw new Error("种子卡未生成");
const { seedId } = await me.post("/api/seeds", { card: step.card });
log(`种子已发布：${step.card.title}`);

// 3. 无感等待：对面自动出现「愿意参与」的同伴
const intent = await waitFor("有同伴表达了意向（我全程没切换身份）", async () => {
  const d = await me.get(`/api/seeds/${seedId}`);
  return d.intents.find((i) => i.status === "interested") ?? null;
}, 240000);
console.log(`  → ${intent.candidate.name}（${intent.candidate.grade} ${intent.candidate.major}）留言: ${intent.note ?? "-"}`);

// 4. 成局进房
const { roomId } = await me.post(`/api/seeds/${seedId}/choose`, { matchId: intent.matchId });
log(`成局！房间 ${roomId}`);

// 5. 我发消息 → 对面真人感回应
await me.post(`/api/rooms/${roomId}/messages`, { content: "哈喽！周日下午两点体育馆西馆集合可以吗？" });
await waitFor("对方回了我消息", async () => {
  const d = await me.get(`/api/rooms/${roomId}`);
  const humanReplies = d.messages.filter((m) => m.kind === "text" && !m.mine);
  if (humanReplies.length > 0) {
    console.log(`  → 对方: ${humanReplies[humanReplies.length - 1].content}`);
    return true;
  }
  return null;
}, 60000, 3000);

await me.post(`/api/rooms/${roomId}/messages`, { content: "好呀，那就这么定，我带两筒球！" });
await waitFor("对方又接了话", async () => {
  const d = await me.get(`/api/rooms/${roomId}`);
  return d.messages.filter((m) => m.kind === "text" && !m.mine).length >= 2 || null;
}, 60000, 3000);

// 6. 整理约定 → 我确认 → 对面自动跟进 → 花苞
await me.post(`/api/rooms/${roomId}/pact`, { action: "draft" });
await me.post(`/api/rooms/${roomId}/pact`, { action: "confirm" });
await waitFor("对方确认了约定，花苞 🌷", async () => {
  const d = await me.get(`/api/rooms/${roomId}`);
  return d.room.stage === "bud" || null;
}, 90000, 4000);

// 7. 我完成 → 对面自动完成 → 开花
await me.post(`/api/rooms/${roomId}/complete`);
await waitFor("对方也确认完成，开花 🌸", async () => {
  const d = await me.get(`/api/rooms/${roomId}`);
  return d.room.stage === "bloom" || null;
}, 90000, 4000);

// 8. 我留回忆 → 对面自动留 → 共同回忆生成
await me.post(`/api/rooms/${roomId}/memory`, { willRejoin: true, text: "打得超尽兴，下周再来！" });
const memoryId = await waitFor("共同回忆已生成", async () => {
  const d = await me.get(`/api/rooms/${roomId}`);
  return d.memoryId ?? null;
}, 120000, 4000);
const forest = await me.get("/api/forest");
if (!forest.memories.find((m) => m.id === memoryId)) throw new Error("森林中未见回忆");
log("回忆已入森林");

console.log(`\n🎉 第一视角无感闭环通过（${((Date.now() - t0) / 1000).toFixed(0)}s，全程未切换身份）`);
