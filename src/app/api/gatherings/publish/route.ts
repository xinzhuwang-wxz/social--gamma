import { NextRequest, NextResponse } from "next/server";
import { getState, appendEvent, snapshot } from "@/lib/demo/state";
import { readJson } from "@/lib/http";
import { fabricateCandidates, getPresetCandidates } from "@/lib/demo/sim";

export async function POST(req: NextRequest) {
  const body =
    (await readJson<{
      idea?: string;
      time?: string;
      place?: string;
      people?: string;
      companion?: string;
      habit?: string;
      activityDetail?: string;
    }>(req)) ?? {};
  const s = getState();
  s.published = true;
  s.draft = {
    idea: String(body.idea || "").trim(),
    time: String(body.time || "").trim(),
    place: String(body.place || "").trim(),
    people: String(body.people || "").trim(),
    companion: String(body.companion || "").trim(),
    habit: String(body.habit || "").trim(),
    activityDetail: String(body.activityDetail || "").trim(),
  };
  // 预置需求使用稳定候选人保证演示；自由输入继续由 LLM 即时生成。
  try {
    s.candidates = getPresetCandidates(s.draft.idea) ?? (await fabricateCandidates(s.draft));
  } catch (err) {
    console.error("[demo] fabricateCandidates failed", err);
    s.candidates = [];
  }
  appendEvent("GATHERING_PUBLISHED", { ...s.draft, candidates: s.candidates.length });
  return NextResponse.json(snapshot(), { status: 201 });
}
