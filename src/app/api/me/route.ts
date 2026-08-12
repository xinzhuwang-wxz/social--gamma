import { NextResponse } from "next/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser } from "@/lib/session";

export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ me: null }, { status: 401 });

  const mailboxUnread = (
    await db
      .select({ id: schema.matches.id })
      .from(schema.matches)
      .where(
        and(
          eq(schema.matches.candidateId, me.id),
          eq(schema.matches.unread, true),
          inArray(schema.matches.status, ["delivered", "closed"])
        )
      )
  ).length;

  const myRooms = await db
    .select({ id: schema.rooms.id, stage: schema.rooms.stage })
    .from(schema.rooms)
    .where(
      or(eq(schema.rooms.ownerId, me.id), eq(schema.rooms.partnerId, me.id))
    );

  const activeRooms = myRooms.filter((r) => r.stage !== "bloom").length;

  return NextResponse.json({
    me,
    counts: { mailboxUnread, activeRooms },
  });
}
