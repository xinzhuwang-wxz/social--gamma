import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { planEventIntervention } from "@/lib/ai/room";
import { encodeEventAiMessage, type EventAiPayload, readableMessage } from "@/lib/event-message";
import { seedToCard } from "@/lib/matching";
import { createPactDraft } from "@/lib/pacts";
import { emitRoom } from "@/lib/room-events";
import { uid } from "@/lib/session";

export type EventCoordinationResult =
  | { intervened: false; reason: string }
  | { intervened: true; payload: EventAiPayload };

const coordinationQueues = new Map<string, Promise<EventCoordinationResult>>();

export async function insertEventAiMessage(roomId: string, payload: EventAiPayload) {
  await db.insert(schema.messages).values({
    id: `msg_${uid()}`,
    roomId,
    senderId: null,
    kind: "ai",
    content: encodeEventAiMessage(payload),
    createdAt: new Date(),
  });
  emitRoom(roomId);
}

export async function coordinateRoomAction(
  roomId: string,
  options: { force?: boolean } = {}
): Promise<EventCoordinationResult> {
  const previous = coordinationQueues.get(roomId);
  const current = (previous ? previous.catch(() => undefined) : Promise.resolve()).then(() =>
    coordinateRoomActionOnce(roomId, options)
  );
  coordinationQueues.set(roomId, current);
  try {
    return await current;
  } finally {
    if (coordinationQueues.get(roomId) === current) coordinationQueues.delete(roomId);
  }
}

async function coordinateRoomActionOnce(
  roomId: string,
  options: { force?: boolean }
): Promise<EventCoordinationResult> {
  const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, roomId));
  if (!room || room.stage === "bloom" || room.stage === "bud") {
    return { intervened: false, reason: "room_inactive" };
  }

  const rows = await db
    .select({ message: schema.messages, user: schema.users })
    .from(schema.messages)
    .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
    .where(eq(schema.messages.roomId, roomId))
    .orderBy(asc(schema.messages.createdAt));
  const latestMessage = rows.at(-1)?.message;
  if (!options.force && latestMessage?.kind !== "text") {
    return { intervened: false, reason: "no_new_human_message" };
  }

  const speakers = new Set(
    rows.filter(({ message }) => message.kind === "text" && message.senderId).map(({ message }) => message.senderId)
  );
  if (!options.force && speakers.size < 2) {
    return { intervened: false, reason: "waiting_for_both_sides" };
  }

  const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, room.seedId));
  if (!seed) return { intervened: false, reason: "seed_missing" };
  const [pact] = await db
    .select()
    .from(schema.pacts)
    .where(eq(schema.pacts.roomId, roomId))
    .orderBy(desc(schema.pacts.version))
    .limit(1);
  if (pact?.status === "confirmed") return { intervened: false, reason: "pact_confirmed" };

  const decision = await planEventIntervention(
    seedToCard(seed),
    rows.slice(-30).map(({ message, user }) => ({
      senderName: message.kind === "text" ? user?.name ?? "?" : "事件 AI",
      content: readableMessage(message.content),
      kind: message.kind,
    })),
    pact ? { status: pact.status, content: pact.content } : null
  );
  if (!decision.shouldIntervene || decision.action === "none" || !decision.text.trim()) {
    return { intervened: false, reason: "ai_kept_silent" };
  }

  let pactId: string | undefined;
  if (decision.action === "create_pact") {
    if (pact?.status === "draft") {
      return { intervened: false, reason: "pact_already_draft" };
    }
    const created = await createPactDraft(roomId);
    if (!created) return { intervened: false, reason: "pact_not_created" };
    pactId = created.id;
  }

  const payload: EventAiPayload = {
    action: decision.action,
    text: decision.text.trim(),
    options: decision.options,
    pactId,
  };
  await insertEventAiMessage(roomId, payload);
  return { intervened: true, payload };
}
