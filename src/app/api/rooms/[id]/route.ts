import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser } from "@/lib/session";
import { roomForUser } from "@/lib/room-access";

/** GET /api/rooms/:id — 房间全量（轮询源）：房间、种子、对方、消息、约定、我的角色 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const room = await roomForUser(id, me.id);
  if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isOwner = room.ownerId === me.id;
  const otherId = isOwner ? room.partnerId : room.ownerId;

  const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, room.seedId));
  const [other] = await db.select().from(schema.users).where(eq(schema.users.id, otherId));
  const msgs = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.roomId, id))
    .orderBy(asc(schema.messages.createdAt));
  const [pact] = await db
    .select()
    .from(schema.pacts)
    .where(eq(schema.pacts.roomId, id))
    .orderBy(desc(schema.pacts.version))
    .limit(1);

  // 成局那条匹配记录里的 A2A（折叠展示）
  const matches = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.seedId, room.seedId));
  const chosen = matches.find((m) => m.status === "chosen") ?? null;

  const entries = await db
    .select()
    .from(schema.memoryEntries)
    .where(eq(schema.memoryEntries.roomId, id));
  const myMemoryDone = entries.some((e) => e.userId === me.id);

  const [memory] = await db.select().from(schema.memories).where(eq(schema.memories.roomId, id));

  return NextResponse.json({
    room: {
      id: room.id,
      stage: room.stage,
      icebreak: room.icebreak,
      summary: isOwner ? room.summaryCard?.forOwner : room.summaryCard?.forPartner,
      myCompleted: isOwner ? room.ownerCompleted : room.partnerCompleted,
      otherCompleted: isOwner ? room.partnerCompleted : room.ownerCompleted,
      isOwner,
    },
    seed: {
      id: seed.id,
      title: seed.title,
      what: seed.what,
      whenText: seed.whenText,
      whereText: seed.whereText,
      groupSize: seed.groupSize,
    },
    other: {
      id: other.id,
      name: other.name,
      emoji: other.emoji,
      color: other.color,
      grade: other.grade,
      major: other.major,
    },
    a2a: chosen?.a2a ?? null,
    messages: msgs.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      kind: m.kind,
      content: m.content,
      mine: m.senderId === me.id,
      createdAt: m.createdAt,
    })),
    pact: pact ?? null,
    myMemoryDone,
    memoryId: memory?.id ?? null,
  });
}
