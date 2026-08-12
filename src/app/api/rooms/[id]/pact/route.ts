import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser, uid } from "@/lib/session";
import { draftPact } from "@/lib/ai/room";
import { seedToCard } from "@/lib/matching";
import { roomForUser } from "@/lib/room-access";
import { emitRoom } from "@/lib/room-events";
import { simOnPactConfirmed } from "@/lib/sim";

/**
 * POST /api/rooms/:id/pact
 * { action: "draft" }   → AI 整理已谈内容生成约定草稿（新版本，确认状态清零）
 * { action: "confirm" } → 我确认当前草稿；全体确认 → status=confirmed，植物花苞
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

  const { action } = await req.json();
  const isOwner = room.ownerId === me.id;

  const [latest] = await db
    .select()
    .from(schema.pacts)
    .where(eq(schema.pacts.roomId, id))
    .orderBy(desc(schema.pacts.version))
    .limit(1);

  if (action === "draft") {
    const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, room.seedId));
    const msgs = await db
      .select({ m: schema.messages, u: schema.users })
      .from(schema.messages)
      .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
      .where(eq(schema.messages.roomId, id))
      .orderBy(asc(schema.messages.createdAt));

    try {
      const draft = await draftPact(
        seedToCard(seed),
        msgs
          .filter(({ m }) => m.kind === "text")
          .map(({ m, u }) => ({ senderName: u?.name ?? "?", content: m.content, kind: m.kind }))
      );
      const version = (latest?.version ?? 0) + 1;
      await db.insert(schema.pacts).values({
        id: `pact_${uid()}`,
        roomId: id,
        content: {
          what: draft.what,
          when: draft.when,
          where: draft.where,
          meet: draft.meet,
          notes: [
            ...draft.notes,
            ...draft.missing.map((m) => `待商量：${m.replace(/待(商量|确认|定)$/, "").trim()}`),
          ],
        },
        status: "draft",
        ownerConfirmed: false,
        partnerConfirmed: false,
        version,
        createdAt: new Date(),
      });
      // 草稿出现 → 植物进入生长期
      if (room.stage === "leafing" || room.stage === "sprout") {
        await db.update(schema.rooms).set({ stage: "growing" }).where(eq(schema.rooms.id, id));
      }
      emitRoom(id);
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("pact draft error", e);
      return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }
  }

  if (action === "confirm") {
    if (!latest || latest.status === "confirmed") {
      return NextResponse.json({ error: "no draft" }, { status: 400 });
    }

    // 幂等：避免重复写入
    const existing = await db
      .select()
      .from(schema.pactConfirmations)
      .where(
        and(
          eq(schema.pactConfirmations.pactId, latest.id),
          eq(schema.pactConfirmations.userId, me.id)
        )
      );
    if (existing.length === 0) {
      await db.insert(schema.pactConfirmations).values({
        id: `pc_${uid()}`,
        pactId: latest.id,
        userId: me.id,
        createdAt: new Date(),
      });
    }

    // 统计确认数 vs 总成员数
    const confirmations = await db
      .select()
      .from(schema.pactConfirmations)
      .where(eq(schema.pactConfirmations.pactId, latest.id));

    const members = await db
      .select()
      .from(schema.roomMembers)
      .where(eq(schema.roomMembers.roomId, id));
    const totalRequired = members.length > 0 ? members.length : 2;
    const confirmed = confirmations.length >= totalRequired;

    // 同时更新 ownerConfirmed / partnerConfirmed（1对1 旧字段兼容）
    const ownerConfirmed = latest.ownerConfirmed || isOwner;
    const partnerConfirmed = latest.partnerConfirmed || !isOwner;

    await db
      .update(schema.pacts)
      .set({
        ownerConfirmed,
        partnerConfirmed,
        status: confirmed ? "confirmed" : "draft",
      })
      .where(eq(schema.pacts.id, latest.id));

    if (confirmed) {
      await db.update(schema.rooms).set({ stage: "bud" }).where(eq(schema.rooms.id, id));
      await db.insert(schema.messages).values({
        id: `msg_${uid()}`,
        roomId: id,
        senderId: null,
        kind: "system",
        content: "🌷 行动约定已由双方确认，植物结出花苞。到时见！",
        createdAt: new Date(),
      });
    }
    emitRoom(id);
    if (!me.isSim && !confirmed) simOnPactConfirmed(req.nextUrl.origin, id);
    return NextResponse.json({ ok: true, confirmed });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
