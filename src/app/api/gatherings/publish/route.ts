import { NextRequest, NextResponse } from "next/server";
import { getState, appendEvent, snapshot } from "@/lib/demo/state";
import { readJson } from "@/lib/http";
import { fabricateCandidates } from "@/lib/demo/sim";

export async function POST(req: NextRequest) {
  const body =
    (await readJson<{ idea?: string; time?: string; place?: string; people?: string }>(req)) ?? {};
  const s = getState();
  s.published = true;
  s.draft = {
    idea: String(body.idea || "").trim(),
    time: String(body.time || "").trim(),
    place: String(body.place || "").trim(),
    people: String(body.people || "").trim(),
  };
  // 真实 LLM 即时捏出正好合拍的仿真候选人（用户侧无感）
  try {
    s.candidates = await fabricateCandidates(s.draft);
  } catch (err) {
    console.error("[demo] fabricateCandidates failed", err);
    s.candidates = [];
  }
  appendEvent("GATHERING_PUBLISHED", { ...s.draft, candidates: s.candidates.length });
  return NextResponse.json(snapshot(), { status: 201 });
}
