import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { checkInWorld } from "@/lib/world-gathering";

export async function POST() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const snap = await checkInWorld(me);
  if (!snap) return NextResponse.json({ error: "请先确认行动约定" }, { status: 409 });
  return NextResponse.json(snap);
}
