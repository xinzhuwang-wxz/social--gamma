import { NextRequest, NextResponse } from "next/server";
import { getState, appendEvent, snapshot } from "@/lib/demo/state";
import { readJson } from "@/lib/http";
export async function POST(req: NextRequest) {
  const body = (await readJson(req)) ?? {};
  const s = getState();
  if (!s.checkedIn) return NextResponse.json({ error: "请先完成打卡" }, { status: 409 });
  s.archived = true; appendEvent("MEMORY_ARCHIVED", body);
  return NextResponse.json(snapshot());
}
