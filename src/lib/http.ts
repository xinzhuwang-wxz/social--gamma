import { NextRequest, NextResponse } from "next/server";

/** 安全解析 JSON body：畸形 body 返回 null（调用方回 400），不抛 500 */
export async function readJson<T = Record<string, unknown>>(
  req: NextRequest
): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export const badRequest = (msg = "invalid request") =>
  NextResponse.json({ error: msg }, { status: 400 });

/** 截断字符串到上限（防超长输入撑爆存储/展示）*/
export function cap(s: unknown, max: number): string {
  return String(s ?? "").slice(0, max);
}
