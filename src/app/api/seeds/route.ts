import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentUser, uid } from "@/lib/session";
import { seedCardSchema } from "@/lib/ai/schemas";
import { runMatching } from "@/lib/matching";

/** GET /api/seeds — 我发布的种子 */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const mine = await db
    .select()
    .from(schema.seeds)
    .where(eq(schema.seeds.ownerId, me.id))
    .orderBy(desc(schema.seeds.createdAt));
  return NextResponse.json({ seeds: mine });
}

/** POST /api/seeds — { card } 用户确认种子卡后发布（AI 不得代发） */
export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = seedCardSchema.safeParse(body.card);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid card" }, { status: 400 });
  }
  const card = parsed.data;
  const id = `s_${uid()}`;
  await db.insert(schema.seeds).values({
    id,
    ownerId: me.id,
    title: card.title,
    what: card.what,
    whenText: card.whenText,
    whereText: card.whereText,
    groupSize: card.groupSize,
    requirements: card.requirements,
    tags: card.tags,
    status: "matching",
    createdAt: new Date(),
  });

  // 异步匹配管线（信使鸟去送信），不阻塞响应
  runMatching(id).catch((e) => console.error("matching failed", e));

  return NextResponse.json({ ok: true, seedId: id });
}
