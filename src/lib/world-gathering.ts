import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { uid } from "@/lib/session";
import type { SeedCard } from "@/lib/ai/schemas";
import { partnersNeeded, simEnabled, fabricatePersonas } from "@/lib/sim";
import { runMatching } from "@/lib/matching";
import { roomKickoff, roomKickoffGroup } from "@/lib/ai/room";
import { seedToCard, toProfile } from "@/lib/matching";
import { simOnHumanMessage, simOnRoomCreated } from "@/lib/sim";

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
};

export type WorldSnapshot = {
  published: boolean;
  selectedCandidate: string | null;
  messages: { id: string; author: string; text: string }[];
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

function stageFromRoom(stage?: string | null) {
  if (!stage) return "SEED";
  return {
    sprout: "SPROUT",
    leafing: "LEAF",
    growing: "GROWING",
    bud: "BUD",
    bloom: "BLOOM",
  }[stage] ?? "SEED";
}

function candidateFromMatch(
  match: typeof schema.matches.$inferSelect,
  user: typeof schema.users.$inferSelect
): WorldCandidate {
  return {
    name: user.name,
    avatar: user.name.slice(0, 1) || user.emoji,
    match: match.reasons[0]?.type ?? "interest",
    note: match.note ?? match.reasons[0]?.text ?? "条件合适，值得聊聊",
    facts: match.a2a?.commonalities?.length ? match.a2a.commonalities : match.reasons.map((r) => r.text),
    reason: match.reasons.map((r) => r.text).join("；") || "匹配条件较好",
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
    if (simEnabled()) {
      await fabricatePersonas(card, partnersNeeded(card.groupSize));
    }
    await runMatching(seedId);
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
    content: "两位 Agent 已完成交接。接下来由你们决定具体怎么安排。",
    createdAt: new Date(),
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
  simOnHumanMessage(origin, s.roomId);
  return worldSnapshot(user.id);
}

export async function resetWorldGathering(userId: string) {
  const all = (g.__worldGathering ??= {});
  all[userId] = { events: [], cleared: true };
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

  return {
    published: Boolean(seed),
    selectedCandidate: s.selectedCandidate ?? null,
    messages,
    slots: { people: Boolean(room), time: false, place: false },
    checkedIn: room?.stage === "bloom",
    archived: false,
    events: s.events,
    stage: stageFromRoom(room?.stage) || (seed ? "SEED" : "SEED"),
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

  return rows.map(({ message, user }) => ({
    id: message.id,
    author: message.senderId === meId ? "me" : user?.name ?? "system",
    text: message.content,
  }));
}
