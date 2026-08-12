import { eq } from "drizzle-orm";
import { db, schema } from "./db/client";

/** 房间访问控制：优先查 roomMembers（新房间），兼容旧行 owner/partner 判断 */
export async function roomForUser(roomId: string, userId: string) {
  const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, roomId));
  if (!room) return null;

  // 新房间：通过 roomMembers 判断
  const members = await db
    .select()
    .from(schema.roomMembers)
    .where(eq(schema.roomMembers.roomId, roomId));

  if (members.length > 0) {
    if (!members.some((m) => m.userId === userId)) return null;
    return room;
  }

  // 旧房间兼容：ownerId / partnerId 判断
  if (room.ownerId !== userId && room.partnerId !== userId) return null;
  return room;
}
