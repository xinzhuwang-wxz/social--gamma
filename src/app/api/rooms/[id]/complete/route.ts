import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser, uid } from "@/lib/session";
import { roomForUser } from "@/lib/room-access";
import { emitRoom } from "@/lib/room-events";

/** POST /api/rooms/:id/complete — 我确认行动已完成；双确认 → 开花 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const room = await roomForUser(id, me.id);
  if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isOwner = room.ownerId === me.id;
  const ownerCompleted = room.ownerCompleted || isOwner;
  const partnerCompleted = room.partnerCompleted || !isOwner;
  const both = ownerCompleted && partnerCompleted;

  await db
    .update(schema.rooms)
    .set({
      ownerCompleted,
      partnerCompleted,
      stage: both ? "bloom" : room.stage,
    })
    .where(eq(schema.rooms.id, id));

  if (both) {
    await db.insert(schema.messages).values({
      id: `msg_${uid()}`,
      roomId: id,
      senderId: null,
      kind: "system",
      content: "🌸 你们的行动真实发生了，植物开花啦！去留下这段回忆吧。",
      createdAt: new Date(),
    });
  }

  emitRoom(id);
  return NextResponse.json({ ok: true, both });
}
