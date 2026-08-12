import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "file:./data/social-forest.db";

// file: 模式确保目录存在
if (url.startsWith("file:")) {
  const p = url.slice(5);
  fs.mkdirSync(path.dirname(path.resolve(p)), { recursive: true });
}

const client = createClient({ url });
export const db = drizzle(client, { schema });
export { schema };
