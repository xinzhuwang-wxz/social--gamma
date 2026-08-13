import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { generateObject } from "ai";
import { z } from "zod";
import type { BloomFusion } from "@/lib/bloom-fusion";
import { NO_THINK, strongModel } from "@/lib/ai/provider";

const OUTPUT_DIR = path.resolve(process.cwd(), "public/world/generated");

const visualPlanSchema = z.object({
  silhouette: z.string().describe("一眼可见的统一植物轮廓，以及它比源花高级在哪里"),
  sourceOneInheritance: z.array(z.string()).min(1).max(3),
  sourceTwoInheritance: z.array(z.string()).min(1).max(3),
  relationshipGlyphs: z.array(z.string()).min(1).max(3),
  paletteStrategy: z.string(),
  upgradeSignals: z.array(z.string()).min(3).max(6),
  uniquenessStatement: z.string(),
});

const visualReviewSchema = z.object({
  upgradedAtFirstGlance: z.boolean(),
  singleCoherentPlant: z.boolean(),
  sourceOneVisible: z.boolean(),
  sourceTwoVisible: z.boolean(),
  relationshipMemoriesVisible: z.boolean(),
  score: z.number().min(0).max(100),
  evidence: z.array(z.string()).max(8),
  issues: z.array(z.string()).max(6),
});

export type BloomVisualPlan = z.infer<typeof visualPlanSchema>;
export type BloomVisualReview = z.infer<typeof visualReviewSchema>;

function publicAssetPath(url: string) {
  if (!url.startsWith("/world/")) throw new Error(`暂不支持的源花地址：${url}`);
  const resolved = path.resolve(process.cwd(), "public", url.slice(1));
  const publicRoot = path.resolve(process.cwd(), "public");
  if (!resolved.startsWith(`${publicRoot}${path.sep}`)) throw new Error("源花地址越界");
  return resolved;
}

function imageDataUrl(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${fs.readFileSync(filename).toString("base64")}`;
}

async function normalizeFlowerPng(buffer: Buffer, filepath: string, maxContentSize: number) {
  const { data, info } = await sharp(buffer)
    .resize(1024, 1024, { fit: "contain" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const samplePoints = [0, width - 1, (height - 1) * width, height * width - 1];
  const background = [0, 1, 2].map((channel) =>
    Math.round(samplePoints.reduce((sum, pixel) => sum + data[pixel * channels + channel], 0) / samplePoints.length)
  );
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const enqueue = (pixel: number) => {
    if (visited[pixel]) return;
    visited[pixel] = 1;
    const offset = pixel * channels;
    const distance = Math.hypot(
      data[offset] - background[0],
      data[offset + 1] - background[1],
      data[offset + 2] - background[2]
    );
    if (distance > 46) return;
    data[offset + 3] = 0;
    queue[tail++] = pixel;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(pixel - 1);
    if (x + 1 < width) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - width);
    if (y + 1 < height) enqueue(pixel + width);
  }
  const transparent = await sharp(data, { raw: info }).png().toBuffer();
  const trimmed = await sharp(transparent)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(maxContentSize, maxContentSize, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed, gravity: "center" }])
    .png()
    .toFile(filepath);
}

async function planRelationshipBloom(fusion: BloomFusion): Promise<BloomVisualPlan> {
  const sources = fusion.sourceFlowers;
  const { object } = await generateObject({
    model: strongModel,
    schema: visualPlanSchema,
    providerOptions: NO_THINK,
    system: [
      "你是 CoBloom 的关系花美术导演。单次经历花遵守一段经历对应一种真实花卉；关系花则是独立的成熟进化层，允许融合视觉语言。",
      "目标不是把两张图并排或做拼贴，而是设计一株统一、完整、明显更高级的全新植物。",
      "高级感必须来自可见的剪影、花冠层级、分枝结构、关系花心和细节秩序，不能只靠变大、发光或写 L2。",
      "每朵源花至少保留一个可指出的形态特征，每段回忆至少保留一个有事实依据的纹样。",
      "轮廓必须由连续主干和自然分枝支撑；严禁折扇、拱门、彩虹、徽章、曼陀罗或机械同心圆结构。",
    ].join("\n"),
    prompt: JSON.stringify({
      target: {
        level: fusion.tier.level,
        name: fusion.tier.name,
        form: fusion.tier.form,
        scaleComparedWithL1: fusion.tier.scale,
        visualRule: fusion.tier.visualRule,
      },
      sourceFlowers: sources.map((flower, index) => ({
        index: index + 1,
        title: flower.title,
        memory: `${flower.completedAt}，${flower.place}：${flower.summary} “${flower.quote}”`,
        currentImage: flower.assetUrl,
        palette: flower.palette,
        motifs: flower.motifs,
      })),
      visibleSourceImageNotes: [
        "源图一是队友 skill 根据第一段回忆生成的单一真实樱花：拱形木质枝条、五瓣花与花苞。",
        "源图二是队友 skill 根据第二段回忆生成的单一真实勿忘我：蓝色五瓣小花、暖黄色花心与纤细分枝。",
      ],
    }),
  });
  return object;
}

function buildPrompt(fusion: BloomFusion, plan: BloomVisualPlan, reviewIssues: string[] = []) {
  return [
    `Create ONE complete collectible ${fusion.tier.name}, level ${fusion.tier.level}, as a coherent new botanical organism.` ,
    "Use both attached source flower images as authoritative visual references. Do not place them side by side and do not make a collage.",
    `Use the plan only as semantic guidance, but replace any dish, fan, arch, rainbow, mandala or mechanical ring idea with a NATURAL BOTANICAL CROWN. Target form: ${fusion.tier.form}; the flower crown should read roughly ${Math.round((fusion.tier.scale - 1) * 100)}% grander than either L1 source while keeping generous padding.`,
    `Clearly inherit from source image one: ${plan.sourceOneInheritance.join(", ")}. The OUTER crown must visibly use pink five-petal cherry-blossom lobes with their shallow notches.`,
    `Clearly inherit from source image two: ${plan.sourceTwoInheritance.join(", ")}. The INNER crown must contain at least five clearly visible sky-blue five-petal forget-me-not blossoms with warm yellow centers. Do not replace their blue with green.`,
    `Transform the two memories into restrained botanical glyphs: ${plan.relationshipGlyphs.join(", ")}.`,
    `Palette strategy: ${plan.paletteStrategy}. Relationship uniqueness: ${plan.uniquenessStatement}.`,
    `Visible upgrade signals: ${plan.upgradeSignals.join(", ")}.`,
    "Art direction: Japanese storybook illustration, simplified botanical shapes, thick soft dark-purple outlines, flat pastel colors, rounded organic silhouette, cozy premium mobile-game collectible, centered front-facing slight three-quarter view, full plant visible.",
    "Required anatomy: one uninterrupted central stem grows from the bottom and divides organically into exactly three supporting branches; every blossom visibly grows from those branches. Form a rounded heart-or-crown silhouette: larger pink five-petal cherry blossoms are the outer supporting layer, while at least five smaller sky-blue five-petal forget-me-nots rise as the inner layer. The result must have a new unmistakable silhouette, a shared living core, more ordered detail and branching than either source. Keep botanical areas dominant. Integrate one camera-aperture sparkle into one golden flower core and put a restrained film-perforation rhythm on ONE leaf vein only, never as a literal grid or row of circles.",
    reviewIssues.length ? `Fix these prior review issues: ${reviewIssues.join("; ")}.` : "",
    "Background: transparent if supported; otherwise a single flat warm rice-white #F7F0DE. No scenery, no ground, no pot, no people, no text, no letters, no logo, no UI, no label, no border, no photorealism, no cast shadow. ABSOLUTELY NO fan, folding fan, arch, rainbow, wreath, badge, mandala, circular frame, geometric device, or disconnected plant parts.",
  ].filter(Boolean).join(" ");
}

async function callSeedream(prompt: string, references: string[] = []) {
  const apiKey = process.env.ARK_API_KEY;
  const baseUrl = process.env.ARK_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3";
  const model = process.env.ARK_IMAGE_MODEL ?? "doubao-seedream-5-0-260128";
  if (!apiKey) throw new Error("ARK_API_KEY not set");

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      ...(references.length ? { image: references.map((url) => imageDataUrl(publicAssetPath(url))) } : {}),
      // Seedream 5.0 requires at least 3,686,400 source pixels. We render at
      // 2048 and normalize to the skill contract's 1024px deliverable.
      size: "2048x2048",
      response_format: "b64_json",
      watermark: false,
    }),
  });
  if (!response.ok) throw new Error(`ARK image API error ${response.status}: ${await response.text()}`);
  const result = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const first = result.data?.[0];
  if (!first) throw new Error("ARK image API returned no image");
  if (first.b64_json) return { buffer: Buffer.from(first.b64_json, "base64"), model };
  if (first.url) {
    const download = await fetch(first.url);
    if (!download.ok) throw new Error(`生成图下载失败：${download.status}`);
    return { buffer: Buffer.from(await download.arrayBuffer()), model };
  }
  throw new Error("ARK image API returned neither b64_json nor url");
}

export async function generateExperienceFlowerFromManifest(manifestPath: string, filename: string, referenceImages: string[] = []) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    prompt: string;
    negativePrompt: string;
    selection: { isHybrid: boolean; speciesId: string };
  };
  if (manifest.selection.isHybrid) throw new Error("L1 经历花不能是杂交花");
  const prompt = `${manifest.prompt} ${manifest.negativePrompt}. Background transparent if supported; otherwise one flat warm rice-white #F7F0DE.`;
  const generated = await callSeedream(prompt, referenceImages);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  await normalizeFlowerPng(generated.buffer, path.join(OUTPUT_DIR, filename), 760);
  fs.copyFileSync(manifestPath, path.join(OUTPUT_DIR, filename.replace(/\.png$/, ".manifest.json")));
  return { url: `/world/generated/${filename}`, model: generated.model };
}

async function reviewRelationshipBloom(buffer: Buffer, fusion: BloomFusion): Promise<BloomVisualReview> {
  const [sourceOne, sourceTwo] = fusion.artwork.request.referenceImages.map((url) => fs.readFileSync(publicAssetPath(url)));
  const { object } = await generateObject({
    model: strongModel,
    schema: visualReviewSchema,
    providerOptions: NO_THINK,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: `下面依次是 L1 源花一、L1 源花二、生成的 L${fusion.tier.level} 关系花。请直接做视觉对照。关系花应是一株统一植物，并明显高于两朵普通 L1 源花。规则：${fusion.tier.visualRule}。源花一应继承粉色五瓣樱花和拱形枝条；源花二应继承蓝色五瓣勿忘我、黄色花心和纤细分枝；还应能找到相机光圈/闪光与胶片齿孔的克制抽象痕迹。不要因为画面精美就放宽要求。` },
        { type: "file", data: sourceOne, mediaType: "image/png" },
        { type: "file", data: sourceTwo, mediaType: "image/png" },
        { type: "file", data: buffer, mediaType: "image/png" },
      ],
    }],
  });
  return object;
}

export async function generateBloomFusionArtwork(fusion: BloomFusion) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const cachedImage = path.join(OUTPUT_DIR, `${fusion.id}.png`);
  const cachedManifest = path.join(OUTPUT_DIR, `${fusion.id}.manifest.json`);
  if (fs.existsSync(cachedImage) && fs.existsSync(cachedManifest)) {
    const cached = JSON.parse(fs.readFileSync(cachedManifest, "utf8")) as {
      prompt: string;
      plan: BloomVisualPlan;
      review: BloomVisualReview;
      model: string;
    };
    const accepted = cached.review.score >= 78 && cached.review.upgradedAtFirstGlance && cached.review.singleCoherentPlant && cached.review.sourceOneVisible && cached.review.sourceTwoVisible && cached.review.relationshipMemoriesVisible;
    if (accepted) return {
      url: `/world/generated/${fusion.id}.png`,
      model: cached.model,
      prompt: cached.prompt,
      visualPlan: { ...cached.plan, review: cached.review },
      review: cached.review,
    };
  }
  const plan = await planRelationshipBloom(fusion);
  let prompt = buildPrompt(fusion, plan);
  let generated = await callSeedream(prompt, fusion.artwork.request.referenceImages);
  let review = await reviewRelationshipBloom(generated.buffer, fusion);
  const reviews = [review];

  for (let attempt = 1; attempt < 3; attempt += 1) {
    const accepted = review.score >= 78 && review.upgradedAtFirstGlance && review.singleCoherentPlant && review.sourceOneVisible && review.sourceTwoVisible && review.relationshipMemoriesVisible;
    if (accepted) break;
    prompt = buildPrompt(fusion, plan, review.issues);
    generated = await callSeedream(prompt, fusion.artwork.request.referenceImages);
    review = await reviewRelationshipBloom(generated.buffer, fusion);
    reviews.push(review);
  }

  const filename = `${fusion.id}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);
  await normalizeFlowerPng(generated.buffer, filepath, 900);
  const metadata = await sharp(filepath).metadata();
  if (metadata.width !== 1024 || metadata.height !== 1024) throw new Error("生成图尺寸不是 1024x1024");

  const manifest = {
    fusionId: fusion.id,
    sourceFlowerIds: fusion.sourceFlowerIds,
    sourceImages: fusion.artwork.request.referenceImages,
    sourceMemories: fusion.artwork.request.promptContext.factualStory,
    tier: fusion.tier,
    plan,
    prompt,
    review,
    reviews,
    provider: "volcengine-ark",
    model: generated.model,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, `${fusion.id}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);

  const accepted = review.score >= 78 && review.upgradedAtFirstGlance && review.singleCoherentPlant && review.sourceOneVisible && review.sourceTwoVisible && review.relationshipMemoriesVisible;
  if (!accepted) throw new Error(`生成完成但未通过关系花视觉验收（${review.score} 分）：${review.issues.join("；")}`);

  return {
    url: `/world/generated/${filename}`,
    model: generated.model,
    prompt,
    visualPlan: { ...plan, review },
    review,
  };
}
