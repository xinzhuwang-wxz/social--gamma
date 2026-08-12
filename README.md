# 社交森林 · 发芽 🌱

> 种下一个行动愿望，让它长成一段真实的共同经历。

抖音 AI 社交赛题决赛作品：校园搭子行动社交 H5。用户用一句话种下「行动种子」，信使鸟（个人 Agent）真实调用 LLM 澄清需求、A2A 匹配投递；候选人回应后由发起人**亲自**选人成局；行动房间里事件 AI 只破冰一次、在用户主动「推进」时协助跨过决策卡点；「行动约定」双确认后植物结出花苞，行动真实完成、双方确认后开花；双方都愿意再组队时生成共同回忆进入各自「森林」，并可「结出新种子」再约一次——完整闭环。

- 产品蓝本与视觉规范：`docs/social-forest-prd-v0.md`
- 领域词汇表（写码前必读）：`CONTEXT.md`
- PRD 与切片：GitHub Issues #1–#9

## 本地运行

```bash
pnpm install
cp .env.example .env.local   # 填入 ARK_API_KEY（火山方舟）
pnpm db:push && pnpm db:seed # 建库 + 写入候选池 persona
pnpm dev                     # http://localhost:3000（手机与电脑同网段可直接访问 Network 地址）
```

## 验证（全部真实 LLM，无 mock）

```bash
pnpm test                    # AI 能力冒烟（6 条，真实 ARK）
pnpm e2e                     # API 全链路闭环（约 90s）
node scripts/ui-journey.mjs  # UI 双角色全旅程 17 检查点（Playwright）
```

## 服务器部署

```bash
docker build -t social-forest .
docker run -d -p 3000:3000 \
  -e ARK_API_KEY=你的火山方舟密钥 \
  -v social-forest-data:/app/data \
  social-forest
```

或免 Docker：`pnpm build && node .next/standalone/server.js`（先设好 `.env.local`，并在启动前跑一次 `pnpm db:push && pnpm db:seed`）。

## 技术栈

Next.js 16（App Router/Turbopack）· Vercel AI SDK（`@ai-sdk/openai-compatible` → 火山方舟 doubao-seed-2.0，严格 json_schema 结构化输出，交互路径关闭深度思考）· Drizzle + libsql（SQLite，file→Turso 可平滑切换）· Tailwind v4 · motion · 手绘风 SVG 世界资产（信使鸟/植物 3科×6阶段/花园场景）· LXGW WenKai + Noto Sans SC 自托管。

## 产品红线

1. AI 只出候选与草稿，连接对象由真人选择；
2. AI 不代答、不代诺、不自动确认安排；
3. A2A 对话必须明确标注，不交换联系方式；
4. 共同回忆需双方确认完成且双方愿意再组队，任一方拒绝不生成、不告知是谁。
