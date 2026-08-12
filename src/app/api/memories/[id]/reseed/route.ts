import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser, uid } from "@/lib/session";
import { runDirectDelivery } from "@/lib/matching";

/**
 * POST /api/memories/:id/reseed — { whenText, notes? }
 * 让成熟植物结出新种子：继承活动类型与原搭子，定向邀请。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const [row] = await db
    .select({ memory: schema.memories, room: schema.rooms, seed: schema.seeds })
    .from(schema.memories)
    .innerJoin(schema.rooms, eq(schema.memories.roomId, schema.rooms.id))
    .innerJoin(schema.seeds, eq(schema.rooms.seedId, schema.seeds.id))
    .where(eq(schema.memories.id, id));

  if (!row || (row.room.ownerId !== me.id && row.room.partnerId !== me.id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json();
  const whenText = String(body.whenText ?? "").trim();
  if (!whenText) return NextResponse.json({ error: "whenText required" }, { status: 400 });

  const partnerId = row.room.ownerId === me.id ? row.room.partnerId : row.room.ownerId;
  const newId = `s_${uid()}`;

  await db.insert(schema.seeds).values({
    id: newId,
    ownerId: me.id,
    title: row.seed.title,
    what: row.seed.what,
    whenText,
    whereText: body.whereText?.trim() || row.seed.whereText,
    groupSize: row.seed.groupSize,
    requirements: row.seed.requirements,
    tags: row.seed.tags,
    status: "matching",
    reseedFromRoomId: row.room.id,
    directToUserId: partnerId,
    createdAt: new Date(),
  });

  // 定向投递（真实 LLM 生成新一轮 A2A）
  runDirectDelivery(newId).catch((e) => console.error("direct delivery failed", e));

  return NextResponse.json({ ok: true, seedId: newId });
}
