import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser, uid } from "@/lib/session";
import { summarizeMemory } from "@/lib/ai/room";
import { roomForUser } from "@/lib/room-access";
import { generateMemoryIllustration } from "@/lib/ai/illustrate";

/**
 * POST /api/rooms/:id/memory — { willRejoin: boolean, text?: string }
 * 双方都提交且都愿意再组队 → 生成共同回忆（进入双方森林）。
 * 任一方不愿意：不生成，且不告知是谁拒绝。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const room = await roomForUser(id, me.id);
  if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (room.stage !== "bloom") {
    return NextResponse.json({ error: "not completed" }, { status: 400 });
  }

  const body = await req.json();
  if (typeof body.willRejoin !== "boolean") {
    return NextResponse.json({ error: "willRejoin required" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(schema.memoryEntries)
    .where(eq(schema.memoryEntries.roomId, id));
  if (existing.some((e) => e.userId === me.id)) {
    return NextResponse.json({ error: "already submitted" }, { status: 409 });
  }

  await db.insert(schema.memoryEntries).values({
    id: `me_${uid()}`,
    roomId: id,
    userId: me.id,
    willRejoin: body.willRejoin,
    text: body.text || null,
    tags: body.tags ?? null,
    createdAt: new Date(),
  });

  // 双方都已提交？
  const all = await db
    .select()
    .from(schema.memoryEntries)
    .where(eq(schema.memoryEntries.roomId, id));
  const bothSubmitted = all.length >= 2;
  const bothRejoin = bothSubmitted && all.every((e) => e.willRejoin);

  if (bothRejoin) {
    const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, room.seedId));
    const msgs = await db
      .select({ m: schema.messages, u: schema.users })
      .from(schema.messages)
      .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
      .where(eq(schema.messages.roomId, id))
      .orderBy(asc(schema.messages.createdAt));

    let summary = "";
    try {
      summary = await summarizeMemory(
        seed.title,
        msgs.map(({ m, u }) => ({ senderName: u?.name ?? "AI", content: m.content, kind: m.kind })),
        all.map((e) => e.text).filter((t): t is string => !!t)
      );
    } catch (e) {
      console.error("memory summary failed", e);
    }

    const memoryId = `mem_${uid()}`;
    await db.insert(schema.memories).values({
      id: memoryId,
      roomId: id,
      title: seed.title,
      summary: summary || null,
      createdAt: new Date(),
    });

    // 异步生图，不阻塞响应
    const entryTexts = all.map((e) => e.text).filter((t): t is string => !!t);
    generateMemoryIllustration({ memoryId, title: seed.title, entryTexts })
      .then((filename) =>
        db
          .update(schema.memories)
          .set({ imageFile: filename })
          .where(eq(schema.memories.id, memoryId))
      )
      .catch((err) => console.error("[illustrate] failed:", err));
  }

  return NextResponse.json({ ok: true, memoryCreated: bothRejoin });
}
