import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser } from "@/lib/session";

/** GET /api/memories/:id — 回忆详情（各自内容各自管理：只展示我的记录 + 共同摘要） */
export async function GET(
  _req: NextRequest,
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

  const otherId = row.room.ownerId === me.id ? row.room.partnerId : row.room.ownerId;
  const [other] = await db.select().from(schema.users).where(eq(schema.users.id, otherId));
  const entries = await db
    .select()
    .from(schema.memoryEntries)
    .where(eq(schema.memoryEntries.roomId, row.room.id));
  const myEntry = entries.find((e) => e.userId === me.id);

  const imageUrl = row.memory.imageFile
    ? `/api/images/${row.memory.imageFile}`
    : null;

  return NextResponse.json({
    memory: {
      id: row.memory.id,
      title: row.memory.title,
      summary: row.memory.summary,
      date: new Date(row.memory.createdAt).toLocaleDateString("zh-CN"),
      imageUrl,
    },
    seed: { whenText: row.seed.whenText, whereText: row.seed.whereText, tags: row.seed.tags },
    other: { name: other?.name, emoji: other?.emoji, color: other?.color },
    myText: myEntry?.text ?? null,
    roomId: row.room.id,
  });
}
