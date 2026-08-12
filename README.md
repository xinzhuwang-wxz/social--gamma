# 社交森林 · 发芽 🌱

> 种下一个行动愿望，让它长成一段真实的共同经历。

抖音 AI 社交赛题决赛作品：校园搭子行动社交 H5。用户用一句话种下「行动种子」，信使鸟（个人 Agent）真实调用 LLM 澄清需求、A2A 匹配投递；候选人回应后由发起人**亲自**选人成局；行动房间里事件 AI 只破冰一次、在用户主动「推进」时协助跨过决策卡点；「行动约定」双确认后植物结出花苞，行动真实完成、双方确认后开花；双方都愿意再组队时生成共同回忆进入各自「森林」，并可「结出新种子」再约一次——完整闭环。

- 产品蓝本与视觉规范：`docs/social-forest-prd-v0.md`
- 领域词汇表（写码前必读）：`CONTEXT.md`
- PRD 与切片：GitHub Issues #1–#9

## 前端（世界原型 · 直接复用合作方前端）

演示前端是合作方的「花园即世界」单页应用，**原样**放在 `public/world/`（`index.html` / `prototype.js` / `prototype.css` / `assets/`）。根路径 `/` 由 `next.config.ts` 重写到 `public/world/index.html`，页面用 `<base href="/world/">` 让相对资源解析到 `/world/`，而 `/api/*` 为绝对路径直连本项目后端——前后端在同一项目内合为一体，以后前端调整都在这里进行。

它调用的 8 个端点（`/api/demo`、`/api/gatherings/{publish,select,check-in,archive}`、`/api/chat/messages`、`/api/proposals/confirm`、`/api/demo/reset`）在 `src/app/api/**` + `src/lib/demo/*` 实现，其中**发布捏候选人 / 选人开场 / 聊天回复**接的是真实 LLM（`src/lib/demo/sim.ts`，豆包 mini）——用户侧无感地「真有人正好合拍」。植物阶段（SEED→…→FOREST）只由已确认事实派生（`derivePlantStage`），AI 不能直接写。

## 本地运行

```bash
pnpm install
cp .env.example .env.local   # 填入 ARK_API_KEY（火山方舟）
pnpm db:push && pnpm db:seed # 建库 + 写入候选池 persona
pnpm dev                     # http://localhost:3000（手机与电脑同网段可直接访问 Network 地址）
```

## 验证（全部真实 LLM，无 mock）

```bash
pnpm test                       # AI 能力冒烟（6 条，真实 ARK）
node scripts/demo-journey.mjs   # 新前端契约端到端 21 断言（真实 LLM 捏候选人/聊天 + 阶段机）
```

> 前端已统一为 `public/world/` 的世界原型 SPA，旧的 React 页面已移除。`src/app/api/{rooms,seeds,…}` 是早期多人后端引擎，当前 SPA 不调用它，保留备用。

## 服务器部署

```bash
docker build -t social-forest .
docker run -d -p 3000:3000 \
  -e ARK_API_KEY=你的火山方舟密钥 \
  -v social-forest-data:/app/data \
  social-forest
```

或免 Docker：

```bash
pnpm build
cp -r public .next/standalone/            # standalone 不自动带 public/（含 world SPA）
cp -r .next/static .next/standalone/.next/ # 也不自动带前端静态资源
pnpm db:push && pnpm db:seed              # 首次建库 + persona
node .next/standalone/server.js           # 先设好 .env.local
```

（Docker 已在镜像内完成上述拷贝，无需手动。）

## 技术栈

Next.js 16（App Router/Turbopack）· Vercel AI SDK（`@ai-sdk/openai-compatible` → 火山方舟 doubao-seed-2.0，严格 json_schema 结构化输出，交互路径关闭深度思考）· Drizzle + libsql（SQLite，file→Turso 可平滑切换）· Tailwind v4 · motion · 手绘风 SVG 世界资产（信使鸟/植物 3科×6阶段/花园场景）· LXGW WenKai + Noto Sans SC 自托管。

## 产品红线

1. AI 只出候选与草稿，连接对象由真人选择；
2. AI 不代答、不代诺、不自动确认安排；
3. A2A 对话必须明确标注，不交换联系方式；
4. 共同回忆需双方确认完成且双方愿意再组队，任一方拒绝不生成、不告知是谁。
