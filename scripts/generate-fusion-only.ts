import { createBloomFusion, DEMO_EXPERIENCE_FLOWERS } from "../src/lib/bloom-fusion";
import { generateBloomFusionArtwork } from "../src/lib/ai/bloom-artwork";

async function main() {
  const fusion = createBloomFusion(["flower_photo", "flower_film"], DEMO_EXPERIENCE_FLOWERS);
  const result = await generateBloomFusionArtwork(fusion);
  process.stdout.write(`${JSON.stringify({ url: result.url, model: result.model, review: result.review }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
