import { NextRequest, NextResponse } from "next/server";
import { readJson } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { archiveWorld } from "@/lib/world-gathering";

export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await readJson<{ text?: string }>(req)) ?? {};
  const snap = await archiveWorld(me, body.text ?? "");
  if (!snap) return NextResponse.json({ error: "请先完成打卡" }, { status: 409 });
  return NextResponse.json(snap);
}
