import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser, uid } from "@/lib/session";
import { roomKickoff, roomKickoffGroup } from "@/lib/ai/room";
import { seedToCard, toProfile } from "@/lib/matching";

/** POST /api/seeds/:id/choose
 * 单选：{ matchId }        → 1 对 1，兼容旧路径
 * 多选：{ matchIds: [..] } → 1 对 N 群体行动（1-3 个 interested 的 match）
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  // 兼容旧 matchId 字段
  const matchIds: string[] = body.matchIds ?? (body.matchId ? [body.matchId] : []);
  if (matchIds.length === 0) {
    return NextResponse.json({ error: "matchId or matchIds required" }, { status: 400 });
  }
  if (matchIds.length > 3) {
    return NextResponse.json({ error: "at most 3 partners" }, { status: 400 });
  }

  const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, id));
  if (!seed || seed.ownerId !== me.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (seed.status === "formed") {
    return NextResponse.json({ error: "already formed" }, { status: 409 });
  }

  // 验证所有 match 都是 interested 且属于本种子
  const selectedMatches = await db
    .select()
    .from(schema.matches)
    .where(
      and(
        eq(schema.matches.seedId, id),
        inArray(schema.matches.id, matchIds)
      )
    );
  if (
    selectedMatches.length !== matchIds.length ||
    selectedMatches.some((m) => m.status !== "interested")
  ) {
    return NextResponse.json({ error: "invalid match" }, { status: 400 });
  }

  // 查询同行者用户信息
  const partnerUsers = await Promise.all(
    selectedMatches.map((m) =>
      db.select().from(schema.users).where(eq(schema.users.id, m.candidateId)).then((r) => r[0])
    )
  );
  if (partnerUsers.some((u) => !u)) {
    return NextResponse.json({ error: "partner user not found" }, { status: 400 });
  }
  const partners = partnerUsers as (typeof schema.users.$inferSelect)[];

  // 成局：选中所有选择的 match，关闭其余
  await db
    .update(schema.matches)
    .set({ status: "chosen", unread: true })
    .where(and(eq(schema.matches.seedId, id), inArray(schema.matches.id, matchIds)));
  await db
    .update(schema.matches)
    .set({ status: "closed", unread: true })
    .where(
      and(
        eq(schema.matches.seedId, id),
        ne(schema.matches.status, "declined"),
        // 排除已选中的
        ...matchIds.map((mid) => ne(schema.matches.id, mid))
      )
    );
  await db.update(schema.seeds).set({ status: "formed" }).where(eq(schema.seeds.id, id));

  // 创建房间（partnerId 兼容字段存第一位同行者）
  const roomId = `r_${uid()}`;
  const firstPartner = partners[0];

  let kickoff: Awaited<ReturnType<typeof roomKickoff>>;

  if (partners.length === 1) {
    // 1 对 1 路径（与旧行为完全一致）
    kickoff = await roomKickoff(
      seedToCard(seed),
      toProfile(me),
      toProfile(firstPartner),
      selectedMatches[0].a2a
    );
  } else {
    // 群体路径
    kickoff = await roomKickoffGroup(
      seedToCard(seed),
      toProfile(me),
      partners.map(toProfile),
      selectedMatches.map((m) => m.a2a)
    );
  }

  await db.insert(schema.rooms).values({
    id: roomId,
    seedId: id,
    ownerId: me.id,
    partnerId: firstPartner.id,
    stage: "sprout",
    icebreak: kickoff.icebreak,
    summaryCard: { forOwner: kickoff.forOwner, forPartner: kickoff.forPartner },
    createdAt: new Date(),
  });

  // 写入 roomMembers（所有成员，含 owner）
  const memberValues = [
    {
      id: `rm_${uid()}`,
      roomId,
      userId: me.id,
      role: "owner" as const,
      completed: false,
      createdAt: new Date(),
    },
    ...partners.map((p) => ({
      id: `rm_${uid()}`,
      roomId,
      userId: p.id,
      role: "partner" as const,
      completed: false,
      createdAt: new Date(),
    })),
  ];
  await db.insert(schema.roomMembers).values(memberValues);

  // 破冰作为事件 AI 的第一条消息
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
