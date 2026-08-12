import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser, uid } from "@/lib/session";
import { roomKickoff } from "@/lib/ai/room";
import { seedToCard, toProfile } from "@/lib/matching";

/** POST /api/seeds/:id/choose — { matchId } 发起人亲自选定同行者，成局 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { matchId } = await req.json();

  const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, id));
  if (!seed || seed.ownerId !== me.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (seed.status === "formed") {
    return NextResponse.json({ error: "already formed" }, { status: 409 });
  }

  const [match] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId));
  if (!match || match.seedId !== id || match.status !== "interested") {
    return NextResponse.json({ error: "invalid match" }, { status: 400 });
  }

  const [partner] = await db.select().from(schema.users).where(eq(schema.users.id, match.candidateId));

  // 成局：选中 + 关闭其他 + 种子状态
  await db.update(schema.matches).set({ status: "chosen", unread: true }).where(eq(schema.matches.id, matchId));
  await db
    .update(schema.matches)
    .set({ status: "closed", unread: true })
    .where(and(eq(schema.matches.seedId, id), ne(schema.matches.id, matchId), ne(schema.matches.status, "declined")));
  await db.update(schema.seeds).set({ status: "formed" }).where(eq(schema.seeds.id, id));

  // 创建房间 + 事件 AI 开场（真实 LLM：双向摘要卡 + 一次破冰）
  const roomId = `r_${uid()}`;
  const kickoff = await roomKickoff(seedToCard(seed), toProfile(me), toProfile(partner), match.a2a);

  await db.insert(schema.rooms).values({
    id: roomId,
    seedId: id,
    ownerId: me.id,
    partnerId: partner.id,
    stage: "sprout",
    icebreak: kickoff.icebreak,
    summaryCard: { forOwner: kickoff.forOwner, forPartner: kickoff.forPartner },
    createdAt: new Date(),
  });

  // 破冰作为事件 AI 的第一条消息（它唯一一次主动发言）
  await db.insert(schema.messages).values({
    id: `msg_${uid()}`,
    roomId,
    senderId: null,
    kind: "ai",
    content: kickoff.icebreak.message,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true, roomId });
}
