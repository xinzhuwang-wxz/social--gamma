import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const IMAGE_DIR = path.resolve(process.cwd(), "data/images");
// 只允许 alphanumeric、下划线、连字符和点（防路径穿越）
const SAFE_NAME = /^[\w.-]+$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  if (!SAFE_NAME.test(name)) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  }

  const filepath = path.join(IMAGE_DIR, name);
  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const buf = fs.readFileSync(filepath);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
