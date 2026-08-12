import { NextRequest, NextResponse } from "next/server";
import { getState, appendEvent, snapshot } from "@/lib/demo/state";
import { readJson } from "@/lib/http";
export async function POST(req: NextRequest) {
  const body = (await readJson<{ slot?: string; value?: string }>(req)) ?? {};
  if (!["time", "place"].includes(body.slot ?? "")) return NextResponse.json({ error: "未知槽位" }, { status: 400 });
  getState().slots[body.slot as "time" | "place"] = true;
  appendEvent("SLOT_CONFIRMED", { slot: body.slot, value: body.value });
  return NextResponse.json(snapshot());
}
