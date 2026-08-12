import { NextResponse } from "next/server";
import { getState, appendEvent, snapshot } from "@/lib/demo/state";
export async function POST() {
  const s = getState();
  if (!(s.slots.people && s.slots.time && s.slots.place)) return NextResponse.json({ error: "请先确认行动约定" }, { status: 409 });
  s.checkedIn = true; appendEvent("CHECK_IN_CONFIRMED");
  return NextResponse.json(snapshot());
}
