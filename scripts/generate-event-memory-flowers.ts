import fs from "node:fs";
import path from "node:path";
import { generateExperienceFlowerFromManifest } from "../src/lib/ai/bloom-artwork";

const requested = process.argv.filter((value) => value.startsWith("--event=")).map((value) => value.slice(8));
const events = requested.length ? requested : ["hackathon", "ride", "music", "worldcup", "gelato", "tulip"];
const force = process.argv.includes("--force");

async function generate(eventId: string) {
  const output = path.resolve(process.cwd(), `public/world/generated/flower_${eventId}-l1.png`);
  if (!force && fs.existsSync(output)) {
    return { eventId, status: "cached", url: `/world/generated/flower_${eventId}-l1.png` };
  }
  const manifest = path.resolve(process.cwd(), `data/flower-generation/event-v2/${eventId}-manifest.json`);
  const references = ["cover.jpg", "detail-1.jpg", "detail-2.jpg"]
    .map((name) => `/world/event-media/${eventId}/${name}`);
  const result = await generateExperienceFlowerFromManifest(
    manifest,
    `flower_${eventId}-l1.png`,
    references,
  );
  return { eventId, status: "generated", ...result };
}

async function main() {
  const results = [];
  for (let index = 0; index < events.length; index += 2) {
    results.push(...await Promise.all(events.slice(index, index + 2).map(generate)));
  }
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
