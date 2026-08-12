/**
 * 仿真同伴引擎（SIM_MODE=0 关闭，默认开启）。
 *
 * 用户发布种子后：按种子人数要求即时生成恰好合拍的仿真校园人格（豆包 mini），
 * 入库参与**完全真实**的匹配/A2A 管线，并以拟人节奏自动：表达意向 → 聊天推进 →
 * 确认约定 → 完成 → 留回忆。所有动作通过真实 HTTP API（携带自己的会话）完成，
 * 与真人路径共用全部代码。真人用户（isSim=false 且非 persona）不受任何影响。
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { generateObject } from "ai";
import { z } from "zod";
import { db, schema } from "./db/client";
import { fastModel, NO_THINK } from "./ai/provider";
import { uid } from "./session";
import type { SeedCard } from "./ai/schemas";

export function simEnabled() {
  return process.env.SIM_MODE !== "0";
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const after = (ms: number, fn: () => Promise<void>) => {
  setTimeout(() => {
    fn().catch((e) => console.error("[sim]", e?.message ?? e));
  }, ms);
};

/** 解析 groupSize 上限，得出需要的同伴数（1-3） */
export function partnersNeeded(groupSize: string): number {
  const nums = (groupSize.match(/\d+/g) ?? []).map(Number);
  const upper = nums.length ? Math.max(...nums) : 2;
  return Math.min(3, Math.max(1, upper - 1));
}

/* ── 仿真用户的会话（走真实 API 用） ── */
async function simSession(userId: string) {
  const [existing] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.userId, userId))
    .limit(1);
  if (existing) return existing.token;
  const token = crypto.randomUUID();
  await db.insert(schema.sessions).values({ token, userId, createdAt: new Date() });
  return token;
}

async function simFetch(origin: string, userId: string, path: string, body?: object) {
  const token = await simSession(userId);
  const r = await fetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `sf_session=${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`sim ${path} → ${r.status}`);
  return r.json().catch(() => null);
}

/* ── 1. 按种子捏人格（数量正好凑齐） ── */

const fabricateSchema = z.object({
  personas: z.array(
    z.object({
      name: z.string().describe("常见的校园昵称，2-3 字，别用「小蓝/小雨/阿杰/彤彤/老徐/娜娜/大伟/琪琪」"),
      emoji: z.string().describe("一个符合人设的 emoji"),
      grade: z.string().describe("年级，如 大二/研一"),
      major: z.string().describe("专业"),
      bio: z.string().describe("一句话自我介绍，口语化"),
      interests: z.array(z.string()).describe("3-4 个兴趣"),
      schedule: z.string().describe("时间习惯，须与该行动时间兼容"),
      vibe: z.string().describe("做事风格一句话"),
      experiences: z.array(z.string()).describe("2-3 条与该行动相关或相邻的真实感经历"),
    })
  ),
});

export async function fabricatePersonas(seed: SeedCard, count: number) {
  const { object } = await generateObject({
    model: fastModel,
    schema: fabricateSchema,
    providerOptions: NO_THINK,
    system: `为一个校园搭子行动生成 ${count} 位真实可信、彼此不同的大学生人格。
要求：每位都真心想参加这个行动且时间兼容；契合角度各不相同（如经验丰富型/热情新手型/顺路同好型）；
细节具体可信（有真实感的经历），但不要完美到假——可以带一个无伤大雅的小限制（如「得赶末班车」）。`,
    prompt: `## 行动种子\n${JSON.stringify(seed, null, 2)}\n\n生成 ${count} 位人格。`,
  });

  const users: (typeof schema.users.$inferSelect)[] = [];
  const colors = ["#DCE3AE", "#B8C88A", "#D8DE83", "#D7B67A"];
  for (const p of object.personas.slice(0, count)) {
    const row = {
      id: `sim_${uid()}`,
      name: p.name,
      emoji: p.emoji || "🌿",
      color: colors[Math.floor(Math.random() * colors.length)],
      grade: p.grade,
      major: p.major,
      bio: p.bio,
      traits: {
        interests: p.interests,
        schedule: p.schedule,
        vibe: p.vibe,
        experiences: p.experiences,
      },
      isPersona: false,
      isSim: true,
      createdAt: new Date(),
    };
    await db.insert(schema.users).values(row);
    users.push(row as typeof schema.users.$inferSelect);
  }
  return users;
}

/* ── 2. 仿真候选人表达意向 ── */

const inviteReplySchema = z.object({
  note: z.string().describe("愿意参与时附的一句留言，口语化，贴合人设与该行动，不超过 25 字"),
});

export async function simRespondToInvites(origin: string, seedId: string) {
  if (!simEnabled()) return;
  const rows = await db
    .select({ match: schema.matches, user: schema.users })
    .from(schema.matches)
    .innerJoin(schema.users, eq(schema.matches.candidateId, schema.users.id))
    .where(and(eq(schema.matches.seedId, seedId), eq(schema.matches.status, "delivered")));
  const sims = rows.filter((r) => r.user.isSim);
  const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, seedId));
  if (!seed) return;

  for (const { match, user } of sims) {
    after(rand(8000, 30000), async () => {
      // 仍是 delivered 才回应（可能已被关闭）
      const [m] = await db.select().from(schema.matches).where(eq(schema.matches.id, match.id));
      if (m?.status !== "delivered") return;
      const { object } = await generateObject({
        model: fastModel,
        schema: inviteReplySchema,
        providerOptions: NO_THINK,
        system: `你是${user.name}（${user.bio}），收到一个搭子邀请，决定参加。写一句自然的留言。`,
        prompt: `行动：${seed.title}（${seed.whenText}，${seed.whereText}）\n你的人设：${JSON.stringify(user.traits)}`,
      });
      await simFetch(origin, user.id, `/api/invites/${match.id}`, {
        interested: true,
        note: object.note,
      });
    });
  }
}

/* ── 3. 房间内仿真聊天 ── */

const chatReplySchema = z.object({
  reply: z.string().describe("下一条聊天消息，口语化短句（≤40字），像真人打字"),
});

// 每房间防抖，避免连环触发
const roomTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function simMembers(roomId: string) {
  const rows = await db
    .select({ member: schema.roomMembers, user: schema.users })
    .from(schema.roomMembers)
    .innerJoin(schema.users, eq(schema.roomMembers.userId, schema.users.id))
    .where(eq(schema.roomMembers.roomId, roomId));
  if (rows.length > 0) return rows.filter((r) => r.user.isSim).map((r) => r.user);
  // 旧结构房间兼容
  const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, roomId));
  if (!room) return [];
  const users = await db
    .select()
    .from(schema.users)
    .where(inArray(schema.users.id, [room.ownerId, room.partnerId]));
  return users.filter((u) => u.isSim);
}

async function generateSimChat(origin: string, roomId: string) {
  const sims = await simMembers(roomId);
  if (sims.length === 0) return;
  const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, roomId));
  if (!room || room.stage === "bloom") return;
  const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, room.seedId));
  const msgs = await db
    .select({ m: schema.messages, u: schema.users })
    .from(schema.messages)
    .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
    .where(eq(schema.messages.roomId, roomId))
    .orderBy(asc(schema.messages.createdAt));
  if (msgs.length === 0) return;
  const last = msgs[msgs.length - 1];
  // 最后一条已是仿真成员的话 → 不接龙，等真人
  if (last.u?.isSim) return;

  // 选一位仿真成员回应（多人房间随机）
  const speaker = sims[Math.floor(Math.random() * sims.length)];
  const [pact] = await db
    .select()
    .from(schema.pacts)
    .where(eq(schema.pacts.roomId, roomId))
    .limit(1);

  const { object } = await generateObject({
    model: fastModel,
    schema: chatReplySchema,
    providerOptions: NO_THINK,
    system: `你是大学生${speaker.name}（${speaker.bio}；${JSON.stringify(speaker.traits)}）。
你已答应和对方一起完成「${seed?.title}」，正在房间里聊安排。像真人一样接着聊：
- 口语化、简短、自然，可以用一个表情符号
- 主动把安排往前推（回应对方的问题；没定的要素给出自己的具体建议，如时间点/集合地/路线）
- 对方若确认了安排就轻快答应
- 绝不说自己是 AI，不书面腔`,
    prompt: `种子：${JSON.stringify(seed && { title: seed.title, when: seed.whenText, where: seed.whereText })}
约定状态：${pact ? pact.status : "未形成"}
最近对话：
${msgs.slice(-12).map(({ m, u }) => `${m.kind === "text" ? (u?.name ?? "?") : "系统/AI"}: ${m.content}`).join("\n")}

以${speaker.name}的身份回复一条。`,
  });

  await simFetch(origin, speaker.id, `/api/rooms/${roomId}/messages`, {
    content: object.reply,
  });
}

/** 真人发消息后触发（防抖 4-10s，模拟打字间隔） */
export function simOnHumanMessage(origin: string, roomId: string) {
  if (!simEnabled()) return;
  const prev = roomTimers.get(roomId);
  if (prev) clearTimeout(prev);
  roomTimers.set(
    roomId,
    setTimeout(() => {
      roomTimers.delete(roomId);
      generateSimChat(origin, roomId).catch((e) => console.error("[sim chat]", e?.message));
    }, rand(4000, 10000))
  );
}

/** 成局后若真人一直沉默，仿真同伴先开口 */
export function simOnRoomCreated(origin: string, roomId: string) {
  if (!simEnabled()) return;
  after(rand(35000, 60000), async () => {
    const msgs = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.roomId, roomId));
    // 已有任何成员（真人或仿真）开口就不抢话
    if (msgs.some((m) => m.senderId)) return;
    await generateSimChat(origin, roomId);
  });
}

/* ── 4. 约定确认 / 完成 / 回忆（跟随真人） ── */

export function simOnPactConfirmed(origin: string, roomId: string) {
  if (!simEnabled()) return;
  after(rand(6000, 18000), async () => {
    const sims = await simMembers(roomId);
    for (const s of sims) {
      await simFetch(origin, s.id, `/api/rooms/${roomId}/pact`, { action: "confirm" }).catch(() => {});
    }
  });
}

export function simOnHumanCompleted(origin: string, roomId: string) {
  if (!simEnabled()) return;
  after(rand(8000, 20000), async () => {
    const sims = await simMembers(roomId);
    for (const s of sims) {
      await simFetch(origin, s.id, `/api/rooms/${roomId}/complete`, {}).catch(() => {});
    }
  });
}

const memoryTextSchema = z.object({
  text: z.string().describe("完成行动后的一句真实感受，口语化，≤25字"),
});

export function simOnHumanMemory(origin: string, roomId: string) {
  if (!simEnabled()) return;
  after(rand(8000, 20000), async () => {
    const sims = await simMembers(roomId);
    const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, roomId));
    if (!room) return;
    const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, room.seedId));
    for (const s of sims) {
      const { object } = await generateObject({
        model: fastModel,
        schema: memoryTextSchema,
        providerOptions: NO_THINK,
        system: `你是${s.name}，刚和搭子完成了「${seed?.title}」，留一句真实感受。`,
        prompt: `你的人设：${s.bio}`,
      });
      await simFetch(origin, s.id, `/api/rooms/${roomId}/memory`, {
        willRejoin: true,
        text: object.text,
      }).catch(() => {});
    }
  });
}
