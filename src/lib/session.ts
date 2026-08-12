import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "./db/client";

const COOKIE = "sf_session";

export async function currentUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.token, token))
    .limit(1);
  return rows[0]?.user ?? null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Response("unauthorized", { status: 401 });
  return user;
}

export async function createSession(userId: string) {
  const token = crypto.randomUUID();
  await db.insert(schema.sessions).values({
    token,
    userId,
    createdAt: new Date(),
  });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // 仅在 HTTPS 部署时开启（COOKIE_SECURE=1）。默认关：局域网 HTTP 演示
    // （http://<LAN-IP>）下带 Secure 会被浏览器丢弃，导致会话建立失败。
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

export function uid() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}
