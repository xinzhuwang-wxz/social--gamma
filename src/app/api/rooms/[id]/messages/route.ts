import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser, uid } from "@/lib/session";
import { roomForUser } from "@/lib/room-access";

/** POST /api/rooms/:id/messages — { content } 发送真人消息 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const room = await roomForUser(id, me.id);
  if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { content } = await req.json();
  const text = String(content ?? "").trim();
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });

  await db.insert(schema.messages).values({
    id: `msg_${uid()}`,
    roomId: id,
    senderId: me.id,
    kind: "text",
    content: text.slice(0, 2000),
    createdAt: new Date(),
  });

  // 阶段流转：sprout → leafing（双方都开口后，真实交流开始）
  if (room.stage === "sprout") {
    const msgs = await db
      .select({ senderId: schema.messages.senderId })
      .from(schema.messages)
      .where(eq(schema.messages.roomId, id));
    const humans = new Set(msgs.map((m) => m.senderId).filter(Boolean));
    if (humans.has(room.ownerId) && humans.has(room.partnerId)) {
      await db.update(schema.rooms).set({ stage: "leafing" }).where(eq(schema.rooms.id, id));
    }
  }

  return NextResponse.json({ ok: true });
}
