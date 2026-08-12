import { NextRequest, NextResponse } from "next/server";
import { getState, appendEvent, snapshot } from "@/lib/demo/state";
import { readJson } from "@/lib/http";
import { simOpeningLine } from "@/lib/demo/sim";

export async function POST(req: NextRequest) {
  const body = (await readJson<{ name?: string }>(req)) ?? {};
  const s = getState();
  const name = body.name || s.candidates[0]?.name || "小林";
  s.selectedCandidate = name;
  s.slots.people = true;
  const idea = s.draft?.idea || "一起做点事";
  // 仿真同伴成局即发第一句（真人感开场）
  try {
    const opening = await simOpeningLine(name, idea);
    s.messages.push({ id: `msg_${s.messages.length + 1}`, author: name, text: opening });
  } catch (err) {
    console.error("[demo] simOpeningLine failed", err);
  }
  appendEvent("PARTICIPANTS_CONFIRMED", { name });
  return NextResponse.json(snapshot());
}
