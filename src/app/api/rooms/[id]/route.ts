import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser } from "@/lib/session";
import { roomForUser } from "@/lib/room-access";
import { decodeEventAiMessage } from "@/lib/event-message";

/** GET /api/rooms/:id — 房间全量（轮询源）：房间、种子、对方、消息、约定、我的角色 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const room = await roomForUser(id, me.id);
  if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isOwner = room.ownerId === me.id;
  const otherId = isOwner ? room.partnerId : room.ownerId;

  const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, room.seedId));
  const [other] = await db.select().from(schema.users).where(eq(schema.users.id, otherId));
  const msgs = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.roomId, id))
    .orderBy(asc(schema.messages.createdAt));
  const [pact] = await db
    .select()
    .from(schema.pacts)
    .where(eq(schema.pacts.roomId, id))
    .orderBy(desc(schema.pacts.version))
    .limit(1);

  // 成局那条匹配记录里的 A2A（折叠展示）
  const matches = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.seedId, room.seedId));
  const chosen = matches.find((m) => m.status === "chosen") ?? null;

  const entries = await db
    .select()
    .from(schema.memoryEntries)
    .where(eq(schema.memoryEntries.roomId, id));
  const myMemoryDone = entries.some((e) => e.userId === me.id);

  const [memory] = await db.select().from(schema.memories).where(eq(schema.memories.roomId, id));

  // 回忆三态（隐私红线）：form=待我填写 / collecting=已记录待生成（对方拒绝或未提交都归此，不可区分）
  // / created=已生成共同回忆。绝不暴露「对方拒绝」信号。
  const memoryStatus: "form" | "collecting" | "created" | null = memory
    ? "created"
    : myMemoryDone
      ? "collecting"
      : "form";

  // roomMembers（新房间才有）
  const roomMemberRows = await db
    .select()
    .from(schema.roomMembers)
    .where(eq(schema.roomMembers.roomId, id));

  // 获取所有成员用户信息（群体房间）
  let membersWithInfo: Array<{
    id: string;
    name: string | null;
    emoji: string;
    color: string;
    role: "owner" | "partner";
    completed: boolean;
  }> = [];

  if (roomMemberRows.length > 0) {
    const userIds = roomMemberRows.map((m) => m.userId);
    // 逐个查询保持兼容（inArray 需额外 import）
    const allUsers = await Promise.all(
      userIds.map((uid) =>
        db.select().from(schema.users).where(eq(schema.users.id, uid)).then((r) => r[0])
      )
    );
    membersWithInfo = roomMemberRows.map((m) => {
      const u = allUsers.find((u) => u?.id === m.userId);
      return {
        id: m.userId,
        name: u?.name ?? null,
        emoji: u?.emoji ?? "🌱",
        color: u?.color ?? "#DCE3AE",
        role: m.role,
        completed: m.completed,
      };
    });
  }

  // myCompleted / otherCompleted：优先使用 roomMembers
  let myCompleted: boolean;
  let otherCompleted: boolean;

  if (roomMemberRows.length > 0) {
    const myMember = roomMemberRows.find((m) => m.userId === me.id);
    myCompleted = myMember?.completed ?? false;
    const others = roomMemberRows.filter((m) => m.userId !== me.id);
    otherCompleted = others.length > 0 && others.every((m) => m.completed);
  } else {
    // 旧房间兼容
    myCompleted = isOwner ? room.ownerCompleted : room.partnerCompleted;
    otherCompleted = isOwner ? room.partnerCompleted : room.ownerCompleted;
  }

  // pact 增加 myConfirmed / confirmedCount / memberCount
  let enrichedPact: typeof pact & {
    myConfirmed?: boolean;
    confirmedCount?: number;
    memberCount?: number;
  } | null = null;

  if (pact) {
    const confirmations = await db
      .select()
      .from(schema.pactConfirmations)
      .where(eq(schema.pactConfirmations.pactId, pact.id));

    const memberCount = roomMemberRows.length > 0 ? roomMemberRows.length : 2;
    const myConfirmedViaTable = confirmations.some((c) => c.userId === me.id);
    // 旧房间 fallback
    const myConfirmedCompat = isOwner ? pact.ownerConfirmed : pact.partnerConfirmed;
    const myConfirmed = myConfirmedViaTable || myConfirmedCompat;

    enrichedPact = {
      ...pact,
      myConfirmed,
      confirmedCount: confirmations.length > 0 ? confirmations.length : (
        (pact.ownerConfirmed ? 1 : 0) + (pact.partnerConfirmed ? 1 : 0)
      ),
      memberCount,
    };
  }

  return NextResponse.json({
    room: {
      id: room.id,
      stage: room.stage,
      icebreak: room.icebreak,
      summary: isOwner ? room.summaryCard?.forOwner : room.summaryCard?.forPartner,
      myCompleted,
      otherCompleted,
      isOwner,
      memberCount: roomMemberRows.length > 0 ? roomMemberRows.length : 2,
    },
    seed: {
      id: seed.id,
      title: seed.title,
      what: seed.what,
      whenText: seed.whenText,
      whereText: seed.whereText,
      groupSize: seed.groupSize,
    },
    other: {
      id: other.id,
      name: other.name,
      emoji: other.emoji,
      color: other.color,
      grade: other.grade,
      major: other.major,
    },
    members: membersWithInfo.length > 0 ? membersWithInfo : null,
    a2a: chosen?.a2a ?? null,
    messages: msgs.map((m) => {
      const event = decodeEventAiMessage(m.content);
      return {
        id: m.id,
        senderId: m.senderId,
        kind: m.kind,
        content: event?.text ?? m.content,
        event,
        mine: m.senderId === me.id,
        createdAt: m.createdAt,
      };
    }),
    pact: enrichedPact,
    memoryStatus,
    memoryId: memory?.id ?? null,
  });
}
