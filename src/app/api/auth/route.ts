import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { createSession, currentUser, uid } from "@/lib/session";

/** GET /api/auth — 当前用户 + 可选身份列表 */
export async function GET() {
  const me = await currentUser();
  const personas = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      emoji: schema.users.emoji,
      color: schema.users.color,
      grade: schema.users.grade,
      major: schema.users.major,
      bio: schema.users.bio,
    })
    .from(schema.users)
    .where(eq(schema.users.isPersona, true));
  return NextResponse.json({ me, personas });
}

/** POST /api/auth — { userId } 登录已有身份，或 { name, emoji?, bio?, interests? } 创建新身份 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.userId) {
    await createSession(body.userId);
    return NextResponse.json({ ok: true, userId: body.userId });
  }
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const id = `u_${uid()}`;
  await db.insert(schema.users).values({
    id,
    name,
    emoji: body.emoji || "🌱",
    color: "#DCE3AE",
    grade: body.grade || null,
    major: body.major || null,
    bio: body.bio || null,
    traits: {
      interests: body.interests ?? [],
      schedule: body.schedule ?? "",
      vibe: "",
      experiences: [],
    },
    isPersona: false,
    createdAt: new Date(),
  });
  await createSession(id);
  return NextResponse.json({ ok: true, userId: id });
}
