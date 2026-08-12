import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "./db/client";
import { matchCandidates, a2aDialogue, type CandidateProfile } from "./ai/match";
import type { SeedCard } from "./ai/schemas";
import { uid } from "./session";

/** 把用户行转为匹配用画像 */
export function toProfile(u: typeof schema.users.$inferSelect): CandidateProfile {
  return {
    id: u.id,
    name: u.name,
    grade: u.grade,
    major: u.major,
    bio: u.bio,
    traits: u.traits,
  };
}

export function seedToCard(s: typeof schema.seeds.$inferSelect): SeedCard {
  return {
    title: s.title,
    what: s.what,
    whenText: s.whenText,
    whereText: s.whereText,
    groupSize: s.groupSize,
    requirements: s.requirements,
    tags: s.tags,
  };
}

/**
 * 匹配管线（发布种子后异步执行）：
 * 真实 LLM 评估候选池 → 对值得投递的 Top3 生成 A2A → 写入投递记录。
 */
export async function runMatching(seedId: string) {
  const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, seedId));
  if (!seed || seed.status !== "matching") return;

  const [owner] = await db.select().from(schema.users).where(eq(schema.users.id, seed.ownerId));

  // 仿真模式：只把种子投给「为本颗种子即时捏出的、正好合拍的仿真同伴」+ 真人用户，
  // 不混入预设 persona（它们不会自动回应，会造成"投了却没人理"的死投递）。
  const simOn = process.env.SIM_MODE !== "0";
  const allOthers = await db
    .select()
    .from(schema.users)
    .where(ne(schema.users.id, seed.ownerId));
  const candidates = allOthers
    .filter((u) =>
      simOn
        ? u.isSim || (!u.isPersona && !u.isSim) // 仿真同伴 + 真人
        : !u.isSim // 无仿真回归：预设 persona + 真人
    )
    .map(toProfile);
  if (candidates.length === 0) return;

  const card = { ...seedToCard(seed), ownerName: owner.name };
  const results = await matchCandidates(card, candidates);
  const deliverable = results
    .filter((r) => r.worthDelivering)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // 并行生成 A2A
  const withA2a = await Promise.all(
    deliverable.map(async (r) => {
      const cand = candidates.find((c) => c.id === r.candidateId);
      if (!cand) return null;
      const a2a = await a2aDialogue(seedToCard(seed), toProfile(owner), cand);
      return { eval: r, a2a };
    })
  );

  for (const item of withA2a) {
    if (!item) continue;
    await db.insert(schema.matches).values({
      id: `m_${uid()}`,
      seedId: seed.id,
      candidateId: item.eval.candidateId,
      score: item.eval.score,
      reasons: item.eval.reasons,
      a2a: item.a2a,
      status: "delivered",
      unread: true,
      createdAt: new Date(),
    });
  }

  await db.update(schema.seeds).set({ status: "delivered" }).where(eq(schema.seeds.id, seed.id));
}

/** 再约一次：跳过公开匹配，直接定向投递给原搭子 */
export async function runDirectDelivery(seedId: string) {
  const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, seedId));
  if (!seed?.directToUserId) return;
  const [owner] = await db.select().from(schema.users).where(eq(schema.users.id, seed.ownerId));
  const [target] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, seed.directToUserId));
  if (!target) return;

  const a2a = await a2aDialogue(seedToCard(seed), toProfile(owner), toProfile(target));
  await db.insert(schema.matches).values({
    id: `m_${uid()}`,
    seedId: seed.id,
    candidateId: target.id,
    score: 100,
    reasons: [
      { type: "experience", text: `你们上次一起完成过「${seed.title}」相关的行动，${owner.name} 想再约你一次` },
    ],
    a2a,
    status: "delivered",
    unread: true,
    createdAt: new Date(),
  });
  await db.update(schema.seeds).set({ status: "delivered" }).where(eq(schema.seeds.id, seed.id));
}
