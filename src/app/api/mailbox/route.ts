import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser } from "@/lib/session";

/** GET /api/mailbox — 我收到的种子投递 */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await db
    .select({ match: schema.matches, seed: schema.seeds, owner: schema.users })
    .from(schema.matches)
    .innerJoin(schema.seeds, eq(schema.matches.seedId, schema.seeds.id))
    .innerJoin(schema.users, eq(schema.seeds.ownerId, schema.users.id))
    .where(eq(schema.matches.candidateId, me.id))
    .orderBy(desc(schema.matches.createdAt));

  return NextResponse.json({
    items: rows.map(({ match, seed, owner }) => ({
      id: match.id,
      status: match.status,
      unread: match.unread,
      seedTitle: seed.title,
      whenText: seed.whenText,
      whereText: seed.whereText,
      groupSize: seed.groupSize,
      ownerName: owner.name,
      ownerEmoji: owner.emoji,
    })),
  });
}
