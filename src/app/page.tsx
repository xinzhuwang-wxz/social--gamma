import { redirect } from "next/navigation";

// 根路径由 next.config.ts 的 rewrite 直接服务新前端 SPA（public/world/index.html）。
// 此页仅作兜底：万一 rewrite 未命中，也把用户送到 SPA 入口。
export default function Home() {
  redirect("/world/index.html");
}
