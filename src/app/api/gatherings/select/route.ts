import { NextRequest, NextResponse } from "next/server";
import { readJson } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { chooseWorldCandidate } from "@/lib/world-gathering";

export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await readJson<{ name?: string }>(req)) ?? {};
  const result = await chooseWorldCandidate(me, body.name, req.nextUrl.origin);
  return NextResponse.json(result);
}
