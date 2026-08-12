import { NextResponse } from "next/server";
import { desc, eq, or } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser } from "@/lib/session";

/** GET /api/forest — 我的回忆森林（双方共同同意留下的经历） */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 新房间：通过 roomMembers 获取我参与的所有房间 ID
  const myMemberRows = await db
    .select({ roomId: schema.roomMembers.roomId })
    .from(schema.roomMembers)
    .where(eq(schema.roomMembers.userId, me.id));
  const myMemberRoomIds = myMemberRows.map((r) => r.roomId);

  const rows = await db
    .select({ memory: schema.memories, room: schema.rooms })
    .from(schema.memories)
    .innerJoin(schema.rooms, eq(schema.memories.roomId, schema.rooms.id))
    .where(or(eq(schema.rooms.ownerId, me.id), eq(schema.rooms.partnerId, me.id)))
    .orderBy(desc(schema.memories.createdAt));

  // 新房间的回忆（通过 roomMembers 访问）
  let extraRows: typeof rows = [];
  if (myMemberRoomIds.length > 0) {
    // 查询所有 roomMember 对应房间的回忆，排除已通过 owner/partner 找到的
    const existingRoomIds = new Set(rows.map((r) => r.room.id));
    for (const roomId of myMemberRoomIds) {
      if (existingRoomIds.has(roomId)) continue;
      const mems = await db
        .select({ memory: schema.memories, room: schema.rooms })
        .from(schema.memories)
        .innerJoin(schema.rooms, eq(schema.memories.roomId, schema.rooms.id))
        .where(eq(schema.memories.roomId, roomId))
        .orderBy(desc(schema.memories.createdAt));
      extraRows = extraRows.concat(mems);
    }
  }

  const allRows = [...rows, ...extraRows].sort(
    (a, b) => Number(b.memory.createdAt) - Number(a.memory.createdAt)
  );

  const memories = [];
  for (const { memory, room } of allRows) {
    const otherId = room.ownerId === me.id ? room.partnerId : room.ownerId;
    const [other] = await db.select().from(schema.users).where(eq(schema.users.id, otherId));
    const imageUrl = memory.imageFile
      ? `/api/images/${memory.imageFile}`
      : null;
    memories.push({
      id: memory.id,
      title: memory.title,
      summary: memory.summary,
      withName: other?.name ?? "",
      withEmoji: other?.emoji ?? "",
      date: new Date(memory.createdAt).toLocaleDateString("zh-CN"),
      imageUrl,
    });
  }

  return NextResponse.json({ memories });
}
