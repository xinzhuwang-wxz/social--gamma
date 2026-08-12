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
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

export function uid() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}
