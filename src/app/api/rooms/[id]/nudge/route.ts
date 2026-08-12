import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser, uid } from "@/lib/session";
import { nudge } from "@/lib/ai/room";
import { seedToCard } from "@/lib/matching";
import { roomForUser } from "@/lib/room-access";

/** POST /api/rooms/:id/nudge — 用户主动请求事件 AI 推进（一次一个卡点） */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const room = await roomForUser(id, me.id);
  if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, room.seedId));
  const msgs = await db
    .select({ m: schema.messages, u: schema.users })
    .from(schema.messages)
    .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
    .where(eq(schema.messages.roomId, id))
    .orderBy(asc(schema.messages.createdAt));

  const [pact] = await db
    .select()
    .from(schema.pacts)
    .where(eq(schema.pacts.roomId, id))
    .orderBy(desc(schema.pacts.version))
    .limit(1);

  try {
    const result = await nudge(
      seedToCard(seed),
      msgs.slice(-30).map(({ m, u }) => ({
        senderName: m.kind === "text" ? u?.name ?? "?" : "事件AI",
        content: m.content,
        kind: m.kind,
      })),
      pact ? { status: pact.status, content: pact.content } : null
    );

    const text =
      result.kind === "options" && result.options?.length
        ? `${result.text}\n${result.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n（当然，也可以继续聊聊）`
        : result.text;

    await db.insert(schema.messages).values({
      id: `msg_${uid()}`,
      roomId: id,
      senderId: null,
      kind: "ai",
      content: text,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, kind: result.kind });
  } catch (e) {
    console.error("nudge error", e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
