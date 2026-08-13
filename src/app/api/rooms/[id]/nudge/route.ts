import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { roomForUser } from "@/lib/room-access";
import { coordinateRoomAction } from "@/lib/event-coordinator";

/** POST /api/rooms/:id/nudge — 兼容旧客户端的手动推进入口。 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const room = await roomForUser(id, me.id);
  if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });
  // 已开花的房间不再推进（浪费 AI token + 插入误导消息）
  if (room.stage === "bloom") return NextResponse.json({ error: "room already completed" }, { status: 409 });

  try {
    const result = await coordinateRoomAction(id, { force: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("nudge error", e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
