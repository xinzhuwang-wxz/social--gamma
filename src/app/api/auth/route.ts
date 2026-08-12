import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { createSession, currentUser, uid } from "@/lib/session";
import { readJson, badRequest, cap } from "@/lib/http";
import { publicUser } from "@/lib/safe-user";

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
  return NextResponse.json({ me: publicUser(me), personas });
}

/** POST /api/auth — { userId } 登录已有身份，或 { name, emoji?, bio?, interests? } 创建新身份 */
export async function POST(req: NextRequest) {
  const body = await readJson(req);
  if (!body) return badRequest("invalid json");
  if (body.userId) {
    // 只允许登录「演示身份（persona）」或「仿真同伴（sim）」——
    // 防止用他人的 userId 劫持真人会话（真人用户 isPersona=false 且 isSim=false）。
    const [target] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, String(body.userId)))
      .limit(1);
    if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });
    if (!target.isPersona && !target.isSim) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    await createSession(target.id);
    return NextResponse.json({ ok: true, userId: target.id });
  }
  const name = cap(body.name, 24).trim();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const id = `u_${uid()}`;
  await db.insert(schema.users).values({
    id,
    name,
    emoji: cap(body.emoji, 8) || "🌱",
    color: "#DCE3AE",
    grade: body.grade ? cap(body.grade, 20) : null,
    major: body.major ? cap(body.major, 40) : null,
    bio: body.bio ? cap(body.bio, 120) : null,
    traits: {
      interests: Array.isArray(body.interests) ? body.interests.slice(0, 8).map((s: unknown) => cap(s, 20)) : [],
      schedule: cap(body.schedule, 60),
      vibe: "",
      experiences: [],
    },
    isPersona: false,
    createdAt: new Date(),
  });
  await createSession(id);
  return NextResponse.json({ ok: true, userId: id });
}
