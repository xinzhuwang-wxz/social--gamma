import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser, uid } from "@/lib/session";
import { roomForUser } from "@/lib/room-access";
import { emitRoom } from "@/lib/room-events";

/** POST /api/rooms/:id/complete — 我确认行动已完成；全体确认 → 开花 */
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

  // 检查 roomMembers（新房间）
  const members = await db
    .select()
    .from(schema.roomMembers)
    .where(eq(schema.roomMembers.roomId, id));

  let both: boolean;

  if (members.length > 0) {
    // 新房间：更新我的 roomMember.completed
    await db
      .update(schema.roomMembers)
      .set({ completed: true })
      .where(
        and(
          eq(schema.roomMembers.roomId, id),
          eq(schema.roomMembers.userId, me.id)
        )
      );

    // 重新查询检查全体是否完成
    const refreshed = await db
      .select()
      .from(schema.roomMembers)
      .where(eq(schema.roomMembers.roomId, id));
    both = refreshed.every((m) => m.completed);

    // 同时更新 ownerCompleted / partnerCompleted 兼容字段
    const ownerCompleted = room.ownerCompleted || isOwner;
    const partnerCompleted = room.partnerCompleted || (room.partnerId === me.id);
    await db
      .update(schema.rooms)
      .set({
        ownerCompleted: both ? true : ownerCompleted,
        partnerCompleted: both ? true : partnerCompleted,
        stage: both ? "bloom" : room.stage,
      })
      .where(eq(schema.rooms.id, id));
  } else {
    // 旧房间：原有逻辑不变
    const ownerCompleted = room.ownerCompleted || isOwner;
    const partnerCompleted = room.partnerCompleted || !isOwner;
    both = ownerCompleted && partnerCompleted;
    await db
      .update(schema.rooms)
      .set({
        ownerCompleted,
        partnerCompleted,
        stage: both ? "bloom" : room.stage,
      })
      .where(eq(schema.rooms.id, id));
  }

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
