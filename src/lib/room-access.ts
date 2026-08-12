import { eq } from "drizzle-orm";
import { db, schema } from "./db/client";

/** 房间访问控制：仅发起人/同行者可见 */
export async function roomForUser(roomId: string, userId: string) {
  const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, roomId));
  if (!room || (room.ownerId !== userId && room.partnerId !== userId)) return null;
  return room;
}
