import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser } from "@/lib/session";
import { readJson, badRequest } from "@/lib/http";

/** GET /api/invites/:id — 候选人查看一条投递（标记已读） */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const [row] = await db
    .select({ match: schema.matches, seed: schema.seeds, owner: schema.users })
    .from(schema.matches)
    .innerJoin(schema.seeds, eq(schema.matches.seedId, schema.seeds.id))
    .innerJoin(schema.users, eq(schema.seeds.ownerId, schema.users.id))
    .where(eq(schema.matches.id, id));

  if (!row || row.match.candidateId !== me.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (row.match.unread) {
    await db.update(schema.matches).set({ unread: false }).where(eq(schema.matches.id, id));
  }

  // 有限展示发起人信息：只给与事件相关的画像切面
  return NextResponse.json({
    match: {
      id: row.match.id,
      status: row.match.status,
      reasons: row.match.reasons,
      a2a: row.match.a2a,
      note: row.match.note,
    },
    seed: {
      id: row.seed.id,
      title: row.seed.title,
      what: row.seed.what,
      whenText: row.seed.whenText,
      whereText: row.seed.whereText,
      groupSize: row.seed.groupSize,
      requirements: row.seed.requirements,
      tags: row.seed.tags,
      status: row.seed.status,
    },
    owner: {
      name: row.owner.name,
      emoji: row.owner.emoji,
      color: row.owner.color,
      grade: row.owner.grade,
      major: row.owner.major,
      bio: row.owner.bio,
    },
  });
}

/** POST /api/invites/:id — { interested: boolean, note?: string } 候选人回应 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await readJson<{ interested?: boolean; note?: string }>(req);
  if (!body) return badRequest("invalid json");

  const [match] = await db.select().from(schema.matches).where(eq(schema.matches.id, id));
  if (!match || match.candidateId !== me.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (match.status !== "delivered") {
    return NextResponse.json({ error: "already responded" }, { status: 409 });
  }

  await db
    .update(schema.matches)
    .set({
      status: body.interested ? "interested" : "declined",
      note: body.interested ? (body.note || null) : null,
    })
    .where(eq(schema.matches.id, id));

  return NextResponse.json({ ok: true });
}
