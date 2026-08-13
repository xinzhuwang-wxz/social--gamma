import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { uid } from "@/lib/session";
import type { SeedCard } from "@/lib/ai/schemas";
import { partnersNeeded, simEnabled, fabricatePersonas } from "@/lib/sim";
import { runMatching } from "@/lib/matching";
import { roomKickoff, roomKickoffGroup } from "@/lib/ai/room";
import { seedToCard, toProfile } from "@/lib/matching";
import { simOnHumanMessage, simOnRoomCreated } from "@/lib/sim";
import { coordinateRoomAction, insertEventAiMessage } from "@/lib/event-coordinator";
import { decodeEventAiMessage } from "@/lib/event-message";

export type WorldDraft = {
  idea?: string;
  time?: string;
  place?: string;
  people?: string;
  companion?: string;
  habit?: string;
  activityDetail?: string;
};

export type WorldCandidate = {
  name: string;
  avatar: string;
  match: string;
  note: string;
  facts: string[];
  reason: string;
  a2a?: { turns: { agent: string; text: string }[] } | null; // 真实两位 Agent 的 A2A 对话（前端展示）
};

export type WorldSnapshot = {
  published: boolean;
  selectedCandidate: string | null;
  messages: {
    id: string;
    author: string;
    text: string;
    kind: string;
    event?: ReturnType<typeof decodeEventAiMessage>;
  }[];
  pact: {
    id: string;
    status: "draft" | "confirmed";
    content: { what: string; when: string; where: string; meet: string; notes: string[] };
    myConfirmed: boolean;
    confirmedCount: number;
    memberCount: number;
  } | null;
  slots: { people: boolean; time: boolean; place: boolean };
  checkedIn: boolean;
  archived: boolean;
  events: { id: string; type: string; payload: unknown; at: string }[];
  stage: string;
  candidates: WorldCandidate[];
  draft: Required<WorldDraft> | null;
  seedId?: string | null;
  roomId?: string | null;
};

type WorldSessionState = {
  seedId?: string;
  roomId?: string;
  selectedCandidate?: string;
  cleared?: boolean;
  slots?: { time?: boolean; place?: boolean }; // 时间/地点确认（people 由是否成局派生）
  checkedIn?: boolean;
  archived?: boolean;
  memoryText?: string;
  events: WorldSnapshot["events"];
};

const g = globalThis as unknown as { __worldGathering?: Record<string, WorldSessionState> };

function stateFor(userId: string): WorldSessionState {
  const all = (g.__worldGathering ??= {});
  return (all[userId] ??= { events: [] });
}

function appendEvent(userId: string, type: string, payload: unknown = {}) {
  const s = stateFor(userId);
  s.events.push({ id: `evt_${s.events.length + 1}`, type, payload, at: new Date().toISOString() });
}

function clean(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

export function draftToSeedCard(draft: WorldDraft): SeedCard {
  const idea = clean(draft.idea, "一起做点事");
  const time = clean(draft.time, "时间可商量");
  const place = clean(draft.place, "地点可商量");
  const people = clean(draft.people, "2-4 人");
  const companion = clean(draft.companion);
  const habit = clean(draft.habit);
  const activityDetail = clean(draft.activityDetail);

  const must = [activityDetail].filter(Boolean);
  const flexible = [companion, habit].filter(Boolean);

  return {
    title: idea.slice(0, 24),
    what: idea,
    whenText: time,
    whereText: place,
    groupSize: people,
    requirements: { must, flexible },
    tags: inferTags(idea, activityDetail),
  };
}

function inferTags(idea: string, detail: string): string[] {
  const text = `${idea} ${detail}`;
  const tags = new Set<string>();
  if (/爬山|徒步|骑行|跑|球|运动/.test(text)) tags.add("运动");
  if (/自习|学习|阅读|论文|备考/.test(text)) tags.add("学习");
  if (/摄影|拍照|扫街/.test(text)) tags.add("摄影");
  if (/展|演出|音乐|话剧|电影/.test(text)) tags.add("文艺");
  if (tags.size === 0) tags.add("同行");
  return [...tags].slice(0, 3);
}

function draftFromSeed(seed: typeof schema.seeds.$inferSelect): Required<WorldDraft> {
  return {
    idea: seed.title,
    time: seed.whenText,
    place: seed.whereText,
    people: seed.groupSize,
    companion: seed.requirements.flexible[0] ?? "",
    habit: seed.requirements.flexible[1] ?? "",
    activityDetail: seed.requirements.must[0] ?? "",
  };
}

function candidateFromMatch(
  match: typeof schema.matches.$inferSelect,
  user: typeof schema.users.$inferSelect
): WorldCandidate {
  const type = match.reasons[0]?.type ?? "interest";
  const MATCH_LABEL: Record<string, string> = { time: "时间匹配", place: "地点匹配", interest: "兴趣匹配", experience: "经验匹配", skill: "经验匹配" };
  const reasons = match.reasons.map((r) => r.text).filter(Boolean);
  return {
    name: user.name,
    avatar: user.name.slice(0, 1) || user.emoji,
    match: MATCH_LABEL[type] ?? "合拍匹配",
    note: match.note ?? match.reasons[0]?.text ?? "条件合适，值得聊聊",
    facts: match.a2a?.commonalities?.length ? match.a2a.commonalities : reasons,
    reason: reasons[0] || "匹配条件较好", // 只取最贴切的一条，避免候选卡过长
    a2a: match.a2a ? { turns: match.a2a.turns } : null, // 透传真实 A2A 对话给前端展示
  };
}

export async function publishWorldGathering(
  user: typeof schema.users.$inferSelect,
  draft: WorldDraft
): Promise<WorldSnapshot> {
  const card = draftToSeedCard(draft);
  const seedId = `s_${uid()}`;

  await db.insert(schema.seeds).values({
    id: seedId,
    ownerId: user.id,
    title: card.title,
    what: card.what,
    whenText: card.whenText,
    whereText: card.whereText,
    groupSize: card.groupSize,
    requirements: card.requirements,
    tags: card.tags,
    status: "matching",
    createdAt: new Date(),
  });

  const s = stateFor(user.id);
  s.seedId = seedId;
  s.roomId = undefined;
  s.selectedCandidate = undefined;
  s.cleared = false;
  appendEvent(user.id, "GATHERING_PUBLISHED", { seedId });

  try {
    let freshIds: string[] | undefined;
    if (simEnabled()) {
      const personas = await fabricatePersonas(card, Math.max(3, partnersNeeded(card.groupSize) + 1));
      freshIds = personas.map((p) => p.id); // 只匹配本次为这颗种子新捏的人格
    }
    await runMatching(seedId, freshIds);
    appendEvent(user.id, "MATCHING_COMPLETED", { seedId });
  } catch (error) {
    console.error("[world] matching failed", error);
    appendEvent(user.id, "MATCHING_FAILED", { seedId });
  }

  return worldSnapshot(user.id);
}

export async function chooseWorldCandidate(
  user: typeof schema.users.$inferSelect,
  candidateName?: string,
  origin = "http://localhost:3000"
): Promise<WorldSnapshot> {
  const s = stateFor(user.id);
  if (!s.seedId) return worldSnapshot(user.id);

  const rows = await matchRowsForSeed(s.seedId);
  const selected =
    rows.find((r) => r.user.name === candidateName) ??
    rows.find((r) => r.match.status === "interested") ??
    rows[0];
  if (!selected) return worldSnapshot(user.id);

  const seed = await seedForOwner(s.seedId, user.id);
  if (!seed) return worldSnapshot(user.id);

  const partners = [selected.user];
  await db
    .update(schema.matches)
    .set({ status: "chosen", unread: true })
    .where(eq(schema.matches.id, selected.match.id));
  await db.update(schema.seeds).set({ status: "formed" }).where(eq(schema.seeds.id, seed.id));

  const roomId = `r_${uid()}`;
  const kickoff = partners.length === 1
    ? await roomKickoff(seedToCard(seed), toProfile(user), toProfile(partners[0]), selected.match.a2a)
    : await roomKickoffGroup(seedToCard(seed), toProfile(user), partners.map(toProfile), [selected.match.a2a]);

  await db.insert(schema.rooms).values({
    id: roomId,
    seedId: seed.id,
    ownerId: user.id,
    partnerId: partners[0].id,
    stage: "sprout",
    icebreak: kickoff.icebreak,
    summaryCard: { forOwner: kickoff.forOwner, forPartner: kickoff.forPartner },
    createdAt: new Date(),
  });

  await db.insert(schema.roomMembers).values([
    { id: `rm_${uid()}`, roomId, userId: user.id, role: "owner", completed: false, createdAt: new Date() },
    { id: `rm_${uid()}`, roomId, userId: partners[0].id, role: "partner", completed: false, createdAt: new Date() },
  ]);

  await db.insert(schema.messages).values({
    id: `msg_${uid()}`,
    roomId,
    senderId: null,
    kind: "system",
    content: "你们已经组队成功，开始聊聊具体安排吧。",
    createdAt: new Date(),
  });
  await insertEventAiMessage(roomId, {
    action: "icebreak",
    text: kickoff.icebreak.message,
    options: kickoff.icebreak.quickReplies.slice(0, 3),
  });

  s.roomId = roomId;
  s.selectedCandidate = partners[0].name;
  appendEvent(user.id, "PARTICIPANTS_CONFIRMED", { roomId, name: partners[0].name });
  simOnRoomCreated(origin, roomId);

  return worldSnapshot(user.id);
}

export async function addWorldMessage(
  user: typeof schema.users.$inferSelect,
  text: string,
  origin = "http://localhost:3000"
): Promise<WorldSnapshot> {
  const s = stateFor(user.id);
  if (!s.roomId) return worldSnapshot(user.id);
  const content = text.trim().slice(0, 240);
  if (!content) return worldSnapshot(user.id);

  await db.insert(schema.messages).values({
    id: `msg_${uid()}`,
    roomId: s.roomId,
    senderId: user.id,
    kind: "text",
    content,
    createdAt: new Date(),
  });

  const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, s.roomId));
  if (room?.stage === "sprout") {
    await db.update(schema.rooms).set({ stage: "leafing" }).where(eq(schema.rooms.id, s.roomId));
  }

  appendEvent(user.id, "MESSAGE_SENT", { text: content });
  // 事件主持人（小苗）的自动推进不阻塞发消息：后台跑，若有话要说会通过 3 秒轮询呈现。
  // 确定性的「整理成行动约定」由聊天里的按钮触发，演示不依赖这条自动判断。
  coordinateRoomAction(s.roomId).catch((error) => console.error("[event coordinator]", error));
  simOnHumanMessage(origin, s.roomId);
  return worldSnapshot(user.id);
}

export async function resetWorldGathering(userId: string) {
  const all = (g.__worldGathering ??= {});
  all[userId] = { events: [], cleared: true };
}

/** 确认时间/地点槽位（写入行动约定，人来点，AI 不代确认） */
export async function confirmWorldSlot(
  user: typeof schema.users.$inferSelect,
  slot: "time" | "place"
): Promise<WorldSnapshot> {
  const s = stateFor(user.id);
  s.slots = { ...s.slots, [slot]: true };
  appendEvent(user.id, "SLOT_CONFIRMED", { slot });
  return worldSnapshot(user.id);
}

/** 真实行动打卡（需已成局 + 时间地点都确认）→ 开花 */
export async function checkInWorld(
  user: typeof schema.users.$inferSelect
): Promise<WorldSnapshot | null> {
  const snap = await worldSnapshot(user.id);
  if (!(snap.slots.people && snap.slots.time && snap.slots.place)) return null;
  stateFor(user.id).checkedIn = true;
  appendEvent(user.id, "CHECK_IN_CONFIRMED");
  return worldSnapshot(user.id);
}

/** 归档共同回忆（需已打卡）→ 入林。红线#4：双方都愿意再组队才生成 */
export async function archiveWorld(
  user: typeof schema.users.$inferSelect,
  text: string
): Promise<WorldSnapshot | null> {
  const s = stateFor(user.id);
  if (!s.checkedIn) return null;
  s.archived = true;
  s.memoryText = text;
  appendEvent(user.id, "MEMORY_ARCHIVED", { text });
  return worldSnapshot(user.id);
}

export async function worldSnapshot(userId: string): Promise<WorldSnapshot> {
  const s = stateFor(userId);
  const seed = s.seedId ? await seedForOwner(s.seedId, userId) : s.cleared ? null : await latestSeedForOwner(userId);
  if (seed && !s.seedId) s.seedId = seed.id;
  const latestRoom = seed ? await latestRoomForSeed(seed.id, userId) : null;
  if (latestRoom && !s.roomId) s.roomId = latestRoom.id;
  const room = s.roomId
    ? (await db.select().from(schema.rooms).where(eq(schema.rooms.id, s.roomId)).limit(1))[0]
    : latestRoom;
  const candidates = seed ? (await matchRowsForSeed(seed.id)).map(({ match, user }) => candidateFromMatch(match, user)) : [];
  const messages = room
    ? await messagesForRoom(room.id, userId)
    : [];
  const pact = room ? await pactForRoom(room.id, userId) : null;

  // 共同回忆已物化（双方都愿意再组队后 /rooms/[id]/memory 生成）→ 入林。红线#4 的落点。
  const hasMemory = room ? await roomHasMemory(room.id) : false;

  // 阶段以「房间事实」为唯一真相源：pact 起草→growing，pact 双确认→bud，双方打卡完成→bloom，
  // 共同回忆生成→forest。AI 只推进、不直接写阶段。
  const stage = hasMemory
    ? "FOREST"
    : !room
      ? "SEED"
      : room.stage === "bloom"
        ? "BLOOM"
        : room.stage === "bud"
          ? "BUD"
          : room.stage === "growing"
            ? "GROWING"
            : messages.some(message => message.kind === "text")
              ? "LEAF"
              : "SPROUT";

  return {
    published: Boolean(seed),
    selectedCandidate: s.selectedCandidate ?? null,
    messages,
    pact,
    // slots 保留给前端做信息展示：有房间=已组队；有 pact=已整理时间/地点
    slots: { people: Boolean(room), time: Boolean(pact), place: Boolean(pact) },
    checkedIn: room?.stage === "bloom",
    archived: hasMemory,
    events: s.events,
    stage,
    candidates,
    draft: seed ? draftFromSeed(seed) : null,
    seedId: seed?.id ?? null,
    roomId: room?.id ?? null,
  };
}

async function seedForOwner(seedId: string, ownerId: string) {
  const [seed] = await db
    .select()
    .from(schema.seeds)
    .where(eq(schema.seeds.id, seedId))
    .limit(1);
  return seed?.ownerId === ownerId ? seed : null;
}

async function latestSeedForOwner(ownerId: string) {
  const [seed] = await db
    .select()
    .from(schema.seeds)
    .where(eq(schema.seeds.ownerId, ownerId))
    .orderBy(desc(schema.seeds.createdAt))
    .limit(1);
  return seed ?? null;
}

async function latestRoomForSeed(seedId: string, ownerId: string) {
  const [room] = await db
    .select()
    .from(schema.rooms)
    .where(eq(schema.rooms.seedId, seedId))
    .orderBy(desc(schema.rooms.createdAt))
    .limit(1);
  if (!room || room.ownerId !== ownerId) return null;
  return room;
}

async function matchRowsForSeed(seedId: string) {
  return db
    .select({ match: schema.matches, user: schema.users })
    .from(schema.matches)
    .innerJoin(schema.users, eq(schema.matches.candidateId, schema.users.id))
    .where(eq(schema.matches.seedId, seedId))
    .orderBy(desc(schema.matches.score));
}

async function messagesForRoom(roomId: string, meId: string) {
  const rows = await db
    .select({ message: schema.messages, user: schema.users })
    .from(schema.messages)
    .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
    .where(eq(schema.messages.roomId, roomId))
    .orderBy(asc(schema.messages.createdAt));

  return rows.map(({ message, user }) => {
    const event = decodeEventAiMessage(message.content);
    return {
      id: message.id,
      author: message.senderId === meId ? "me" : user?.name ?? "system",
      text: event?.text ?? message.content,
      kind: message.kind,
      event,
    };
  });
}

// 是否已生成共同回忆（双方都愿意再组队时 /rooms/[id]/memory 才写入 memories）→ 入林信号
async function roomHasMemory(roomId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.memories.id })
    .from(schema.memories)
    .where(eq(schema.memories.roomId, roomId))
    .limit(1);
  return Boolean(row);
}

async function pactForRoom(roomId: string, meId: string): Promise<WorldSnapshot["pact"]> {
  const [pact] = await db
    .select()
    .from(schema.pacts)
    .where(eq(schema.pacts.roomId, roomId))
    .orderBy(desc(schema.pacts.version))
    .limit(1);
  if (!pact) return null;

  const confirmations = await db
    .select()
    .from(schema.pactConfirmations)
    .where(eq(schema.pactConfirmations.pactId, pact.id));
  const members = await db
    .select()
    .from(schema.roomMembers)
    .where(eq(schema.roomMembers.roomId, roomId));
  return {
    id: pact.id,
    status: pact.status,
    content: pact.content,
    myConfirmed: confirmations.some((confirmation) => confirmation.userId === meId),
    confirmedCount: confirmations.length,
    memberCount: members.length || 2,
  };
}
