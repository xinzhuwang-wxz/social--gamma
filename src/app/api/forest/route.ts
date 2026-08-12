import { NextResponse } from "next/server";
import { desc, eq, or } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser } from "@/lib/session";

/** GET /api/forest — 我的回忆森林（双方共同同意留下的经历） */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await db
    .select({ memory: schema.memories, room: schema.rooms })
    .from(schema.memories)
    .innerJoin(schema.rooms, eq(schema.memories.roomId, schema.rooms.id))
    .where(or(eq(schema.rooms.ownerId, me.id), eq(schema.rooms.partnerId, me.id)))
    .orderBy(desc(schema.memories.createdAt));

  const memories = [];
  for (const { memory, room } of rows) {
    const otherId = room.ownerId === me.id ? room.partnerId : room.ownerId;
    const [other] = await db.select().from(schema.users).where(eq(schema.users.id, otherId));
    memories.push({
      id: memory.id,
      title: memory.title,
      summary: memory.summary,
      withName: other?.name ?? "",
      withEmoji: other?.emoji ?? "",
      date: new Date(memory.createdAt).toLocaleDateString("zh-CN"),
    });
  }

  return NextResponse.json({ memories });
}
