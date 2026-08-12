import { NextResponse } from "next/server";
import { desc, eq, or } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser } from "@/lib/session";

/** GET /api/rooms — 我的行动房间列表 */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await db
    .select({ room: schema.rooms, seed: schema.seeds })
    .from(schema.rooms)
    .innerJoin(schema.seeds, eq(schema.rooms.seedId, schema.seeds.id))
    .where(or(eq(schema.rooms.ownerId, me.id), eq(schema.rooms.partnerId, me.id)))
    .orderBy(desc(schema.rooms.createdAt));

  const rooms = [];
  for (const { room, seed } of rows) {
    const otherId = room.ownerId === me.id ? room.partnerId : room.ownerId;
    const [other] = await db.select().from(schema.users).where(eq(schema.users.id, otherId));
    const [last] = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.roomId, room.id))
      .orderBy(desc(schema.messages.createdAt))
      .limit(1);
    rooms.push({
      id: room.id,
      title: seed.title,
      stage: room.stage,
      otherName: other?.name ?? "",
      otherEmoji: other?.emoji ?? "",
      lastMessage: last?.content ?? null,
    });
  }

  return NextResponse.json({ rooms });
}
