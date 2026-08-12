import { NextResponse } from "next/server";
import { eq, or, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser } from "@/lib/session";

/** GET /api/garden — 我的花园：进行中的种子与房间（植物） */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ me: null }, { status: 401 });

  const mySeeds = await db
    .select()
    .from(schema.seeds)
    .where(eq(schema.seeds.ownerId, me.id));

  const myRooms = await db
    .select({ room: schema.rooms, seed: schema.seeds })
    .from(schema.rooms)
    .innerJoin(schema.seeds, eq(schema.rooms.seedId, schema.seeds.id))
    .where(or(eq(schema.rooms.ownerId, me.id), eq(schema.rooms.partnerId, me.id)));

  const roomSeedIds = new Set(myRooms.map((r) => r.seed.id));

  const plants = [
    // 匹配中的种子（还没成局）
    ...mySeeds
      .filter((s) => !roomSeedIds.has(s.id) && inArrayStr(s.status, ["matching", "delivered"]))
      .map((s) => ({
        kind: "seed" as const,
        id: s.id,
        title: s.title,
        stage: s.status,
        href: `/seed/${s.id}`,
      })),
    // 已成局的房间
    ...myRooms.map(({ room, seed }) => ({
      kind: "room" as const,
      id: room.id,
      title: seed.title,
      stage: room.stage,
      href: `/room/${room.id}`,
    })),
  ];

  return NextResponse.json({ plants });
}

function inArrayStr(v: string, arr: string[]) {
  return arr.includes(v);
}
