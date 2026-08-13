import path from "node:path";
import { createBloomFusion, DEMO_EXPERIENCE_FLOWERS } from "../src/lib/bloom-fusion";
import {
  generateBloomFusionArtwork,
  generateExperienceFlowerFromManifest,
} from "../src/lib/ai/bloom-artwork";

const projectRoot = process.cwd();

async function main() {
  const sourceOne = await generateExperienceFlowerFromManifest(
    path.join(projectRoot, "data/flower-generation/photo-manifest.json"),
    "flower_photo-l1.png"
  );
  const sourceTwo = await generateExperienceFlowerFromManifest(
    path.join(projectRoot, "data/flower-generation/film-manifest.json"),
    "flower_film-l1.png"
  );
  const fusion = createBloomFusion(["flower_photo", "flower_film"], DEMO_EXPERIENCE_FLOWERS);
  const result = await generateBloomFusionArtwork(fusion);
  process.stdout.write(`${JSON.stringify({ sourceOne, sourceTwo, fusion: { url: result.url, model: result.model, review: result.review } }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
