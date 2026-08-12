/**
 * 新前端契约端到端回归：驱动 8 个 demo 端点走完整旅程，断言植物阶段机。
 * 覆盖真实后端产出：发布捏候选人 / 选人开场 / 聊天真人感回复。
 * 用法：BASE=http://127.0.0.1:3003 node scripts/demo-journey.mjs
 */
const BASE = process.env.BASE || "http://127.0.0.1:3003";

let pass = 0;
let fail = 0;
function check(cond, label, extra) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.error(`  ✗ ${label}${extra ? ` — ${extra}` : ""}`);
  }
}

async function api(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} → ${r.status} ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  console.log(`# demo 契约端到端 @ ${BASE}\n`);

  console.log("重置");
  let s = await api("/api/demo/reset", {});
  check(s.stage === "SEED", "重置后 stage=SEED", `got ${s.stage}`);
  check(!s.selectedCandidate && s.messages.length === 0, "重置后无同伴无消息");

  console.log("发布（真实 LLM 捏候选人）");
  s = await api("/api/gatherings/publish", {
    idea: "一起去图书馆自习",
    time: "本周三晚上",
    place: "图书馆三楼",
    people: "2 人",
  });
  check(s.published === true, "已发布 published=true");
  check(Array.isArray(s.candidates) && s.candidates.length >= 1, "捏出至少 1 位候选人", `got ${s.candidates?.length}`);
  const c0 = s.candidates?.[0] || {};
  check(!!c0.name && !!c0.reason && Array.isArray(c0.facts), "候选人结构完整(name/reason/facts)");
  check(s.draft?.idea === "一起去图书馆自习", "草稿回显 idea");

  const partner = c0.name;
  console.log(`选人（${partner}，真实开场）`);
  s = await api("/api/gatherings/select", { name: partner });
  check(s.selectedCandidate === partner, "已选中该同伴");
  check(s.slots.people === true, "人已确认 slots.people=true");
  check(s.messages.length >= 1 && s.messages[0].author === partner, "同伴发来真实开场");
  check(s.stage === "LEAF" || s.stage === "SPROUT", "选人后 stage=LEAF/SPROUT", `got ${s.stage}`);

  console.log("聊天（真实真人感回复）");
  const before = s.messages.length;
  s = await api("/api/chat/messages", { author: "me", text: "几点到比较好？我先去占座" });
  check(s.messages.length >= before + 2, "我方消息+同伴回复都已入库", `count ${s.messages.length}`);
  const last = s.messages[s.messages.length - 1];
  check(last.author === partner && last.text.length > 0, "最后一条是同伴的真实回复");

  console.log("确认时间");
  s = await api("/api/proposals/confirm", { slot: "time", value: "本周三 19:00" });
  check(s.slots.time === true, "时间已确认");
  check(s.stage === "GROWING", "确认时间后 stage=GROWING", `got ${s.stage}`);

  console.log("确认地点");
  s = await api("/api/proposals/confirm", { slot: "place", value: "图书馆三楼" });
  check(s.slots.place === true, "地点已确认");
  check(s.stage === "BUD", "人/时/地齐全后 stage=BUD", `got ${s.stage}`);

  console.log("打卡");
  s = await api("/api/gatherings/check-in", {});
  check(s.checkedIn === true, "已打卡");
  check(s.stage === "BLOOM", "打卡后 stage=BLOOM", `got ${s.stage}`);

  console.log("归档回忆");
  s = await api("/api/gatherings/archive", { text: "占到了靠窗的位置，效率很高。" });
  check(s.archived === true, "已归档");
  check(s.stage === "FOREST", "归档后 stage=FOREST", `got ${s.stage}`);

  console.log("守卫：未打卡不能归档 / 未齐全不能打卡（reset 后再试）");
  await api("/api/demo/reset", {});
  let guarded = false;
  try {
    await api("/api/gatherings/check-in", {});
  } catch {
    guarded = true;
  }
  check(guarded, "未确认约定时打卡被拒(409)");

  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error("\n运行失败：", err.message);
  process.exit(1);
});
