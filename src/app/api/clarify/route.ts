import { NextRequest, NextResponse } from "next/server";
import { clarifyStep, type ClarifyMessage } from "@/lib/ai/clarify";
import { currentUser } from "@/lib/session";

/** POST /api/clarify — { history: [{role, content}] } → { ready, reply, card } */
export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { history } = (await req.json()) as { history: ClarifyMessage[] };
  if (!Array.isArray(history) || history.length === 0) {
    return NextResponse.json({ error: "history required" }, { status: 400 });
  }
  try {
    const step = await clarifyStep(history.slice(-16));
    return NextResponse.json(step);
  } catch (e) {
    console.error("clarify error", e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
