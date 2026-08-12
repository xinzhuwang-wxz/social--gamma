import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser } from "@/lib/session";

/** GET /api/seeds/:id — 种子详情；发起人视角含意向列表 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, id));
  if (!seed) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isOwner = seed.ownerId === me.id;
  let intents: unknown[] = [];
  if (isOwner) {
    const rows = await db
      .select({ match: schema.matches, candidate: schema.users })
      .from(schema.matches)
      .innerJoin(schema.users, eq(schema.matches.candidateId, schema.users.id))
      .where(eq(schema.matches.seedId, id));
    intents = rows
      .sort((a, b) => b.match.score - a.match.score)
      .map(({ match, candidate }) => ({
        matchId: match.id,
        status: match.status,
        score: match.score,
        reasons: match.reasons,
        note: match.note,
        candidate: {
          id: candidate.id,
          name: candidate.name,
          emoji: candidate.emoji,
          color: candidate.color,
          grade: candidate.grade,
          major: candidate.major,
          bio: candidate.bio,
        },
      }));
  }

  // 若已成局，带上房间入口
  const [room] = await db
    .select({ id: schema.rooms.id })
    .from(schema.rooms)
    .where(eq(schema.rooms.seedId, id));

  // 剥离内部字段（directToUserId/reseedFromRoomId/ownerId 不对外，避免跨用户信息泄露）
  const safeSeed = {
    id: seed.id,
    title: seed.title,
    what: seed.what,
    whenText: seed.whenText,
    whereText: seed.whereText,
    groupSize: seed.groupSize,
    requirements: seed.requirements,
    tags: seed.tags,
    status: seed.status,
    createdAt: seed.createdAt,
  };

  return NextResponse.json({ seed: safeSeed, isOwner, intents, roomId: room?.id ?? null });
}
