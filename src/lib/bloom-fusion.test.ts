import { describe, expect, it } from "vitest";
import {
  createBloomFusion,
  DEMO_EXPERIENCE_FLOWERS,
  findFusionCandidates,
  tierForExperienceCount,
} from "./bloom-fusion";

describe("relationship bloom fusion", () => {
  it("只把同一个人的两段真实经历列为合成候选", () => {
    const candidates = findFusionCandidates(DEMO_EXPERIENCE_FLOWERS);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].partnerName).toBe("橘子汽水");
    expect(candidates[0].sourceFlowers.map((flower) => flower.id)).toEqual([
      "flower_photo",
      "flower_film",
    ]);
  });

  it("两朵经历花生成 L2 共鸣花并保留图生图输入", () => {
    const fusion = createBloomFusion(
      ["flower_photo", "flower_film"],
      DEMO_EXPERIENCE_FLOWERS,
      new Date("2026-08-13T00:00:00.000Z")
    );
    expect(fusion.tier).toMatchObject({ level: 2, name: "双生共鸣花" });
    expect(fusion.sourceFlowerIds).toEqual(["flower_photo", "flower_film"]);
    expect(fusion.artwork.status).toBe("awaiting-generator");
    expect(fusion.artwork.request.referenceImages).toHaveLength(2);
    expect(fusion.artwork.request.promptContext.factualStory).toHaveLength(2);
    expect(fusion.sourceFlowers[0].artwork.request.contractVersion).toBe(
      "experience-flower.v1"
    );
    expect(fusion.palette).toContain("樱花粉");
    expect(fusion.motifs).toContain("胶片齿孔");
  });

  it("不同关系的花不能合成", () => {
    expect(() =>
      createBloomFusion(["flower_photo", "flower_ride"], DEMO_EXPERIENCE_FLOWERS)
    ).toThrow("同一个人");
  });

  it("等级由共同经历数而不是主观好看程度决定", () => {
    expect(tierForExperienceCount(1).name).toBe("经历花");
    expect(tierForExperienceCount(2).name).toBe("双生共鸣花");
    expect(tierForExperienceCount(3).name).toBe("三章故事花");
    expect(tierForExperienceCount(4).name).toBe("四序花冠");
    expect(tierForExperienceCount(5).name).toBe("五星共生花");
    expect(tierForExperienceCount(7).name).toBe("同行枝冠");
    expect(tierForExperienceCount(12).name).toBe("共生王冠");
    expect(tierForExperienceCount(100).name).toBe("百忆神树");
    expect(tierForExperienceCount(37).level).toBe(37);
  });
});
