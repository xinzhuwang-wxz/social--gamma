import { NextRequest, NextResponse } from "next/server";
import { readJson } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { publishWorldGathering, type WorldDraft } from "@/lib/world-gathering";

export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await readJson<WorldDraft>(req)) ?? {};
  const result = await publishWorldGathering(me, body);
  return NextResponse.json(result, { status: 201 });
}
