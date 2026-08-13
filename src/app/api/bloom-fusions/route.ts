import { NextRequest, NextResponse } from "next/server";
import {
  bloomFusionSnapshot,
  fuseExperienceFlowers,
  fusionRequestSchema,
  resetBloomFusionStore,
  setBloomFusionArtwork,
  upsertBloomFusion,
} from "@/lib/bloom-fusion";
import { generateBloomFusionArtwork } from "@/lib/ai/bloom-artwork";
import { readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(bloomFusionSnapshot());
}

export async function POST(req: NextRequest) {
  const parsed = fusionRequestSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "请选择至少两朵经历花" }, { status: 400 });
  }

  try {
    if (parsed.data.generateArtwork) {
      const fusion = upsertBloomFusion(parsed.data.sourceFlowerIds);
      try {
        const result = await generateBloomFusionArtwork(fusion);
        setBloomFusionArtwork(fusion.id, {
          status: "ready",
          url: result.url,
          generation: {
            provider: "volcengine-ark",
            model: result.model,
            prompt: result.prompt,
            visualPlan: result.visualPlan,
            generatedAt: new Date().toISOString(),
          },
          error: undefined,
        });
      } catch (generationError) {
        setBloomFusionArtwork(fusion.id, {
          status: "failed",
          url: null,
          generation: undefined,
          error: generationError instanceof Error ? generationError.message : "升级花生成失败",
        });
        throw generationError;
      }
      return NextResponse.json(bloomFusionSnapshot(), { status: 201 });
    }
    return NextResponse.json(fuseExperienceFlowers(parsed.data.sourceFlowerIds), {
      status: 201,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "花朵共鸣失败" },
      { status: 409 }
    );
  }
}

export async function DELETE() {
  resetBloomFusionStore();
  return NextResponse.json(bloomFusionSnapshot());
}
