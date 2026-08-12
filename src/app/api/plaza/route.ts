import { NextResponse } from "next/server";
import { desc, eq, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

/** 稳定散列 room.id → 0-3（植物科） */
function familyOf(id: string): 0 | 1 | 2 | 3 {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return (h % 4) as 0 | 1 | 2 | 3;
}

/** GET /api/plaza — 公共花园（无需登录） */
export async function GET() {
  const [bloomRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.rooms)
    .where(eq(schema.rooms.stage, "bloom"));

  const [seekRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.seeds)
    .where(
      or(
        eq(schema.seeds.status, "matching"),
        eq(schema.seeds.status, "delivered"),
      ),
    );

  const rows = await db
    .select({ room: schema.rooms, seed: schema.seeds })
    .from(schema.rooms)
    .innerJoin(schema.seeds, eq(schema.rooms.seedId, schema.seeds.id))
    .where(eq(schema.rooms.stage, "bloom"))
    .orderBy(desc(schema.rooms.createdAt))
    .limit(30);

  const plants = rows.map(({ room, seed }) => {
    const d = new Date(room.createdAt);
    return {
      id: room.id,
      title: seed.title,
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      family: familyOf(room.id),
    };
  });

  return NextResponse.json({
    stats: {
      blooming: Number(bloomRow?.count ?? 0),
      seeking: Number(seekRow?.count ?? 0),
    },
    plants,
  });
}
