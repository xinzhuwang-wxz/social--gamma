/** 为缺插画的共同回忆补生成（真实 seedream 调用）。运行：npx tsx scripts/backfill-images.mts */
import { db, schema } from "../src/lib/db/client";
import { generateMemoryIllustration } from "../src/lib/ai/illustrate";
import { isNull, eq } from "drizzle-orm";

const rows = await db.select().from(schema.memories).where(isNull(schema.memories.imageFile));
console.log(`found ${rows.length} memories without illustration`);
for (const m of rows) {
  const entries = await db
    .select()
    .from(schema.memoryEntries)
    .where(eq(schema.memoryEntries.roomId, m.roomId));
  try {
    const f = await generateMemoryIllustration({
      memoryId: m.id,
      title: m.title,
      entryTexts: entries.map((e) => e.text).filter(Boolean) as string[],
    });
    await db.update(schema.memories).set({ imageFile: f }).where(eq(schema.memories.id, m.id));
    console.log("backfilled", m.id, f);
  } catch (e) {
    console.log("fail", m.id, (e as Error).message.slice(0, 140));
  }
}
