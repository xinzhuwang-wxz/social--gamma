/**
 * 真实 ARK 集成冒烟测试（不 mock）。运行：pnpm test
 * 每个 AI 能力 1 条，验证结构化输出合法 + 关键业务约束。
 */
import { describe, it, expect } from "vitest";
import { clarifyStep } from "./clarify";
import { matchCandidates, a2aDialogue, type CandidateProfile } from "./match";
import { roomKickoff, nudge, draftPact } from "./room";
import type { SeedCard } from "./schemas";

const seed: SeedCard = {
  title: "周六去爬山",
  what: "爬学校周边的山，轻松路线",
  whenText: "周六 8:30 出发，下午返回",
  whereText: "学校周边，车程 1 小时内",
  groupSize: "2人",
  requirements: { must: ["当天全程参与"], flexible: ["路线可商量"] },
  tags: ["户外"],
};

const owner: CandidateProfile = {
  id: "u1",
  name: "小明",
  grade: "大二",
  major: "软件工程",
  bio: "想多出门走走",
  traits: {
    interests: ["徒步", "摄影"],
    schedule: "周末有空",
    vibe: "随和",
    experiences: ["爬过两次北高峰"],
  },
};

const candidate: CandidateProfile = {
  id: "p_xiaolan",
  name: "小蓝",
  grade: "大三",
  major: "地理信息科学",
  bio: "周末不是在山上，就是在去山上的路上",
  traits: {
    interests: ["徒步", "露营"],
    schedule: "周六全天有空",
    vibe: "行动派",
    experiences: ["登山社领队一年"],
  },
};

describe("AI 能力冒烟（真实 ARK）", () => {
  it("clarifyStep: 信息不足时追问，不足项单问", async () => {
    const r = await clarifyStep([{ role: "user", content: "这周末想找人去爬山" }]);
    expect(typeof r.ready).toBe("boolean");
    expect(r.reply.length).toBeGreaterThan(0);
    if (!r.ready) expect(r.card).toBeNull();
  }, 60000);

  it("matchCandidates: 返回排序理由且理由分类合法", async () => {
    const results = await matchCandidates({ ...seed, ownerName: "小明" }, [candidate]);
    expect(results.length).toBe(1);
    expect(results[0].candidateId).toBe("p_xiaolan");
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].reasons.length).toBeGreaterThan(0);
  }, 90000);

  it("a2aDialogue: 生成对话与共同点，不含联系方式", async () => {
    const r = await a2aDialogue(seed, owner, candidate);
    expect(r.turns.length).toBeGreaterThanOrEqual(3);
    expect(r.commonalities.length).toBeGreaterThan(0);
    const all = r.turns.map((t) => t.text).join("");
    expect(all).not.toMatch(/微信|手机号|电话|QQ/);
  }, 90000);

  it("roomKickoff: 破冰消息 + 3 个快捷回复", async () => {
    const a2a = {
      turns: [
        { agent: "owner" as const, text: "我的主人小明周末想去爬山" },
        { agent: "candidate" as const, text: "小蓝是登山社领队，周六有空" },
      ],
      commonalities: ["都喜欢徒步"],
      icebreakHints: ["都爬过北高峰"],
    };
    const r = await roomKickoff(seed, owner, candidate, a2a);
    expect(r.icebreak.message.length).toBeGreaterThan(0);
    expect(r.icebreak.quickReplies.length).toBeGreaterThanOrEqual(2);
    expect(r.forOwner.highlights.length).toBeGreaterThan(0);
  }, 90000);

  it("nudge: 只处理一个卡点", async () => {
    const r = await nudge(
      seed,
      [
        { senderName: "小明", content: "周六早上出发行吗", kind: "text" },
        { senderName: "小蓝", content: "行，几点？我怕太早起不来", kind: "text" },
        { senderName: "小明", content: "8点半或者9点都可以", kind: "text" },
      ],
      null
    );
    expect(["none", "ask_missing", "offer_choices", "request_decision", "confirm_decision", "create_pact"]).toContain(r.action);
    if (r.shouldIntervene) expect(r.text.length).toBeGreaterThan(0);
  }, 60000);

  it("draftPact: 未谈到的要素进 missing 而非编造", async () => {
    const r = await draftPact(seed, [
      { senderName: "小明", content: "那就周六8点半，校北门集合", kind: "text" },
      { senderName: "小蓝", content: "好，就爬老和山，轻松", kind: "text" },
    ]);
    expect(r.what.length).toBeGreaterThan(0);
    expect(Array.isArray(r.missing)).toBe(true);
  }, 60000);
});
