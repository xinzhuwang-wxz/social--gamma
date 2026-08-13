import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { draftPact } from "@/lib/ai/room";
import { seedToCard } from "@/lib/matching";
import { uid } from "@/lib/session";

export async function createPactDraft(roomId: string) {
  const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, roomId));
  if (!room || room.stage === "bloom") return null;

  const [seed] = await db.select().from(schema.seeds).where(eq(schema.seeds.id, room.seedId));
  if (!seed) return null;

  const messages = await db
    .select({ message: schema.messages, user: schema.users })
    .from(schema.messages)
    .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
    .where(eq(schema.messages.roomId, roomId))
    .orderBy(asc(schema.messages.createdAt));
  const [latest] = await db
    .select()
    .from(schema.pacts)
    .where(eq(schema.pacts.roomId, roomId))
    .orderBy(desc(schema.pacts.version))
    .limit(1);

  const draft = await draftPact(
    seedToCard(seed),
    messages
      .filter(({ message }) => message.kind === "text")
      .map(({ message, user }) => ({
        senderName: user?.name ?? "?",
        content: message.content,
        kind: message.kind,
      }))
  );
  const pact = {
    id: `pact_${uid()}`,
    roomId,
    content: {
      what: draft.what,
      when: draft.when,
      where: draft.where,
      meet: draft.meet,
      notes: [
        ...draft.notes,
        ...draft.missing.map((item) => `待商量：${item.replace(/待(商量|确认|定)$/, "").trim()}`),
      ],
    },
    status: "draft" as const,
    ownerConfirmed: false,
    partnerConfirmed: false,
    version: (latest?.version ?? 0) + 1,
    createdAt: new Date(),
  };

  await db.insert(schema.pacts).values(pact);
  if (room.stage === "leafing" || room.stage === "sprout") {
    await db.update(schema.rooms).set({ stage: "growing" }).where(eq(schema.rooms.id, roomId));
  }
  return pact;
}
