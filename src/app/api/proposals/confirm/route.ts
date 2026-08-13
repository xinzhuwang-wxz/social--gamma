import { NextRequest, NextResponse } from "next/server";
import { readJson } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { confirmWorldSlot } from "@/lib/world-gathering";

export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await readJson<{ slot?: string; value?: string }>(req)) ?? {};
  if (!["time", "place"].includes(body.slot ?? "")) return NextResponse.json({ error: "未知槽位" }, { status: 400 });

  const snap = await confirmWorldSlot(me, body.slot as "time" | "place");
  return NextResponse.json(snap, { status: 200 });
}
