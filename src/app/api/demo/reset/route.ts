import { NextResponse } from "next/server";
import { resetState, snapshot } from "@/lib/demo/state";
export async function POST() { resetState(); return NextResponse.json(snapshot()); }
