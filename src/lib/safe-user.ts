import type { schema } from "./db/client";

type UserRow = typeof schema.users.$inferSelect;

/**
 * 对外用户投影：**永不泄露 isSim / isPersona 等内部字段**。
 * 仿真同伴对用户端必须完全隐形（用户端无感真实有人）。
 */
export function publicUser<T extends Partial<UserRow> | null | undefined>(u: T) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    emoji: u.emoji,
    color: u.color,
    grade: u.grade ?? null,
    major: u.major ?? null,
    bio: u.bio ?? null,
    traits: u.traits ?? null,
  };
}
