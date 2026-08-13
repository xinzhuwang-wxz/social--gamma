import { NextRequest, NextResponse } from "next/server";
import { readJson } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { addWorldMessage } from "@/lib/world-gathering";

export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await readJson<{ text?: string }>(req)) ?? {};
  const text = String(body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "message required" }, { status: 400 });

  const result = await addWorldMessage(me, text, req.nextUrl.origin);
  return NextResponse.json(result, { status: 201 });
}
