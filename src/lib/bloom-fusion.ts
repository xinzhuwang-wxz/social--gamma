import { z } from "zod";

export const fusionRequestSchema = z.object({
  sourceFlowerIds: z.array(z.string().min(1)).min(2).max(100),
  generateArtwork: z.boolean().optional().default(false),
});

export type ExperienceFlowerArtwork = {
  status: "awaiting-generator" | "ready" | "failed";
  url: string | null;
  request: {
    mode: "text-to-image";
    promptContext: {
      experienceTitle: string;
      place: string;
      factualSummary: string;
      palettes: string[];
      motifs: string[];
    };
    contractVersion: "experience-flower.v1";
  };
};

export type ExperienceFlower = {
  id: string;
  memoryId: string;
  title: string;
  partnerId: string;
  partnerName: string;
  assetUrl: string;
  completedAt: string;
  place: string;
  summary: string;
  quote: string;
  palette: string[];
  motifs: string[];
  artwork: ExperienceFlowerArtwork;
};

export type BloomTier = {
  level: number;
  name: string;
  minimumExperiences: number;
  band: string;
  form: string;
  scale: number;
  complexity: number;
  visualRule: string;
};

export type BloomFusionCandidate = {
  relationshipId: string;
  partnerId: string;
  partnerName: string;
  sourceFlowers: ExperienceFlower[];
  nextTier: BloomTier;
};

export type BloomArtworkRequest = {
  mode: "image-to-image";
  status: "awaiting-generator";
  referenceImages: string[];
  promptContext: {
    relationshipTitle: string;
    experienceTitles: string[];
    palettes: string[];
    motifs: string[];
    factualStory: string[];
    level: number;
    botanicalForm: string;
  };
  contractVersion: "bloom-artwork.v1";
};

export type BloomFusion = {
  id: string;
  relationshipId: string;
  partnerId: string;
  partnerName: string;
  title: string;
  tier: BloomTier;
  experienceCount: number;
  sourceFlowerIds: string[];
  sourceFlowers: ExperienceFlower[];
  palette: string[];
  motifs: string[];
  storyBridge: string;
  artwork: {
    status: "awaiting-generator" | "ready" | "failed";
    url: string | null;
    request: BloomArtworkRequest;
    generation?: {
      provider: "volcengine-ark";
      model: string;
      prompt: string;
      visualPlan: Record<string, unknown>;
      generatedAt: string;
    };
    error?: string;
  };
  createdAt: string;
};

type BloomMilestone = Omit<BloomTier, "level">;

export const BLOOM_MILESTONES: BloomMilestone[] = [
  { name: "经历花", minimumExperiences: 1, band: "一段经历", form: "单层花冠", scale: 1, complexity: 1, visualRule: "一段真实经历决定一种主色与一个记忆纹样" },
  { name: "双生共鸣花", minimumExperiences: 2, band: "双生阶段", form: "双层同心花冠", scale: 1.22, complexity: 2, visualRule: "形成一个统一的新轮廓；花冠至少增加一层，并可辨认地继承两朵源花各一个特征" },
  { name: "三章故事花", minimumExperiences: 3, band: "三章阶段", form: "三向分枝花冠", scale: 1.34, complexity: 3, visualRule: "三条主枝汇入同一花心，三个经历特征形成清晰的三角视觉节奏" },
  { name: "四序花冠", minimumExperiences: 4, band: "四序阶段", form: "四向冠状复瓣", scale: 1.46, complexity: 4, visualRule: "四个方向长出第二圈花冠，轮廓比三章阶段更宽、更稳定" },
  { name: "五星共生花", minimumExperiences: 5, band: "五星阶段", form: "五瓣星冠与双层枝叶", scale: 1.58, complexity: 5, visualRule: "五个主花簇构成星冠，关系专属纹样第一次成为稳定花心" },
  { name: "同行枝冠", minimumExperiences: 6, band: "枝冠阶段", form: "可数分枝花冠", scale: 1.72, complexity: 6, visualRule: "6 至 9 段经历以可数主枝编码，保持一眼可读而不是无限堆花瓣" },
  { name: "共生王冠", minimumExperiences: 10, band: "王冠阶段", form: "冠形多花簇", scale: 1.9, complexity: 7, visualRule: "10 段后进入冠形轮廓，反复出现的共同元素沉淀为关系徽记" },
  { name: "记忆花簇", minimumExperiences: 25, band: "花簇阶段", form: "层叠记忆花簇", scale: 2.15, complexity: 8, visualRule: "25 段后形成高密度但仍有主次的花簇，旧纹样成为花脉而非贴纸" },
  { name: "关系花树", minimumExperiences: 50, band: "花树阶段", form: "小型开花树", scale: 2.45, complexity: 9, visualRule: "50 段后形态从花升级为树：有主干、树冠和只属于这段关系的稳定剪影" },
  { name: "百忆神树", minimumExperiences: 100, band: "百忆阶段", form: "发光纪念花树", scale: 2.8, complexity: 10, visualRule: "100 段共同经历形成独一无二的纪念树冠；等级靠标志性轮廓、层级和光脉共同表达" },
];

function awaitingExperienceArtwork({
  experienceTitle,
  place,
  factualSummary,
  palettes,
  motifs,
}: ExperienceFlowerArtwork["request"]["promptContext"]): ExperienceFlowerArtwork {
  return {
    status: "awaiting-generator",
    url: null,
    request: {
      mode: "text-to-image",
      promptContext: { experienceTitle, place, factualSummary, palettes, motifs },
      contractVersion: "experience-flower.v1",
    },
  };
}

/**
 * 当前世界原型的已完成经历。正式数据链路接通后，这一层替换为 memories +
 * room members 查询；合成规则和前端契约不需要改变。
 */
export const DEMO_EXPERIENCE_FLOWERS: ExperienceFlower[] = [
  {
    id: "flower_photo",
    memoryId: "photo",
    title: "在花落完以前替朋友拍人像",
    partnerId: "partner_orange",
    partnerName: "橘子汽水",
    assetUrl: "/world/generated/flower_photo-l1.png",
    completedAt: "2026-04-05",
    place: "校园樱花道",
    summary: "花瓣落在肩上时，我们刚好在笑一个很普通的笑话。",
    quote: "我确认，当时只是因为一个很普通的笑话。",
    palette: ["樱花粉", "春日白"],
    motifs: ["樱花瓣", "相机光圈"],
    artwork: awaitingExperienceArtwork({
      experienceTitle: "在花落完以前替朋友拍人像",
      place: "校园樱花道",
      factualSummary: "花瓣落在肩上时，我们刚好在笑一个很普通的笑话。",
      palettes: ["樱花粉", "春日白"],
      motifs: ["樱花瓣", "相机光圈"],
    }),
  },
  {
    id: "flower_film",
    memoryId: "study",
    title: "用一卷胶片拍完校园的夏天",
    partnerId: "partner_orange",
    partnerName: "橘子汽水",
    assetUrl: "/world/generated/flower_film-l1.png",
    completedAt: "2026-06-19",
    place: "校园各处",
    summary: "不能重拍以后，我们反而更敢按下快门。",
    quote: "糊掉也是那一秒真的发生过。",
    palette: ["胶片金", "树影绿"],
    motifs: ["胶片齿孔", "夏日树影"],
    artwork: awaitingExperienceArtwork({
      experienceTitle: "用一卷胶片拍完校园的夏天",
      place: "校园各处",
      factualSummary: "不能重拍以后，我们反而更敢按下快门。",
      palettes: ["胶片金", "树影绿"],
      motifs: ["胶片齿孔", "夏日树影"],
    }),
  },
  {
    id: "flower_ride",
    memoryId: "ride",
    title: "沿着西湖骑一整圈夜风",
    partnerId: "partner_riceball",
    partnerName: "饭团",
    assetUrl: "/world/assets/flower-1.png",
    completedAt: "2026-08-07",
    place: "西湖沿线",
    summary: "照片里没有风，但看到它，还是会想起那晚衣角一直被吹起来。",
    quote: "都骑到这里了，要不要把这一圈骑完？",
    palette: ["湖水蓝", "夜色金"],
    motifs: ["闭合轨迹", "晚风"],
    artwork: awaitingExperienceArtwork({
      experienceTitle: "沿着西湖骑一整圈夜风",
      place: "西湖沿线",
      factualSummary: "照片里没有风，但看到它，还是会想起那晚衣角一直被吹起来。",
      palettes: ["湖水蓝", "夜色金"],
      motifs: ["闭合轨迹", "晚风"],
    }),
  },
];

export function tierForExperienceCount(count: number): BloomTier {
  const safeCount = Math.max(1, Math.min(100, Math.floor(count)));
  const milestone = [...BLOOM_MILESTONES]
    .reverse()
    .find((tier) => safeCount >= tier.minimumExperiences) ?? BLOOM_MILESTONES[0];
  return { ...milestone, level: safeCount };
}

export const BLOOM_TIERS: BloomTier[] = [1, 2, 3, 4, 5, 6, 10, 25, 50, 100].map(tierForExperienceCount);

function unique(values: string[], limit: number) {
  return [...new Set(values)].slice(0, limit);
}

export function findFusionCandidates(
  flowers: ExperienceFlower[],
  fusions: BloomFusion[] = []
): BloomFusionCandidate[] {
  const byPartner = new Map<string, ExperienceFlower[]>();
  for (const flower of flowers) {
    const group = byPartner.get(flower.partnerId) ?? [];
    group.push(flower);
    byPartner.set(flower.partnerId, group);
  }

  return [...byPartner.entries()]
    .filter(([, group]) => group.length >= 2)
    .map(([partnerId, group]) => {
      const ordered = [...group].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
      const existing = fusions.find((fusion) => fusion.partnerId === partnerId);
      return {
        relationshipId: existing?.relationshipId ?? `relationship_${partnerId}`,
        partnerId,
        partnerName: ordered[0].partnerName,
        sourceFlowers: ordered,
        nextTier: tierForExperienceCount(ordered.length),
      };
    });
}

export function createBloomFusion(
  flowerIds: string[],
  flowers: ExperienceFlower[] = DEMO_EXPERIENCE_FLOWERS,
  now = new Date()
): BloomFusion {
  const requestedIds = unique(flowerIds, 100);
  const sources = requestedIds
    .map((id) => flowers.find((flower) => flower.id === id))
    .filter((flower): flower is ExperienceFlower => Boolean(flower))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  if (sources.length !== requestedIds.length) throw new Error("有一朵源花不存在");
  if (sources.length < 2) throw new Error("至少选择两朵经历花才能共鸣");
  if (new Set(sources.map((flower) => flower.partnerId)).size !== 1) {
    throw new Error("只有与同一个人共同种下的花才能合成关系花");
  }

  const tier = tierForExperienceCount(sources.length);
  const palette = unique(sources.flatMap((flower) => flower.palette), 4);
  const motifs = unique(sources.flatMap((flower) => flower.motifs), 4);
  const partnerName = sources[0].partnerName;
  const relationshipId = `relationship_${sources[0].partnerId}`;
  const title = tier.level === 2 ? "樱瓣胶片·双生共鸣花" : `${partnerName}的${tier.name}`;
  const lastSource = sources.at(-1) ?? sources[0];
  const storyBridge = `从《${sources[0].title}》（${sources[0].place}），到《${lastSource.title}》（${lastSource.place}），你们已经把 ${sources.length} 次一起发生的事留成了同一条故事线。`;
  const artworkRequest: BloomArtworkRequest = {
    mode: "image-to-image",
    status: "awaiting-generator",
    referenceImages: sources.map((flower) => flower.artwork.url || flower.assetUrl),
    promptContext: {
      relationshipTitle: title,
      experienceTitles: sources.map((flower) => flower.title),
      palettes: palette,
      motifs,
      factualStory: sources.map((flower) => `${flower.completedAt}，${flower.place}：${flower.summary}`),
      level: tier.level,
      botanicalForm: tier.form,
    },
    contractVersion: "bloom-artwork.v1",
  };

  return {
    id: `fusion_${sources[0].partnerId}_${tier.level}`,
    relationshipId,
    partnerId: sources[0].partnerId,
    partnerName,
    title,
    tier,
    experienceCount: sources.length,
    sourceFlowerIds: sources.map((flower) => flower.id),
    sourceFlowers: sources,
    palette,
    motifs,
    storyBridge,
    artwork: { status: "awaiting-generator", url: null, request: artworkRequest },
    createdAt: now.toISOString(),
  };
}

type FusionStore = { fusions: BloomFusion[] };
const globalStore = globalThis as unknown as { __bloomFusionStore?: FusionStore };

export function getBloomFusionStore(): FusionStore {
  return (globalStore.__bloomFusionStore ??= { fusions: [] });
}

export function resetBloomFusionStore() {
  globalStore.__bloomFusionStore = { fusions: [] };
}

export function bloomFusionSnapshot() {
  const store = getBloomFusionStore();
  return {
    progression: BLOOM_TIERS,
    candidates: findFusionCandidates(DEMO_EXPERIENCE_FLOWERS, store.fusions),
    fusions: store.fusions,
  };
}

export function fuseExperienceFlowers(sourceFlowerIds: string[]) {
  const store = getBloomFusionStore();
  const fusion = createBloomFusion(sourceFlowerIds);
  const existingIndex = store.fusions.findIndex(
    (item) => item.relationshipId === fusion.relationshipId
  );
  if (existingIndex >= 0) store.fusions[existingIndex] = fusion;
  else store.fusions.push(fusion);
  return bloomFusionSnapshot();
}

export function upsertBloomFusion(sourceFlowerIds: string[]) {
  const store = getBloomFusionStore();
  const fusion = createBloomFusion(sourceFlowerIds);
  const existingIndex = store.fusions.findIndex((item) => item.relationshipId === fusion.relationshipId);
  if (existingIndex >= 0) store.fusions[existingIndex] = fusion;
  else store.fusions.push(fusion);
  return fusion;
}

export function setBloomFusionArtwork(
  fusionId: string,
  artwork: Pick<BloomFusion["artwork"], "status" | "url" | "generation" | "error">
) {
  const fusion = getBloomFusionStore().fusions.find((item) => item.id === fusionId);
  if (!fusion) throw new Error("找不到要更新的关系花");
  Object.assign(fusion.artwork, artwork);
  return fusion;
}
