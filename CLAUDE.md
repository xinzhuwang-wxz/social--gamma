# social-gamma — 社交森林 Social Forest

校园搭子行动社交 H5（手机端 Web）。用户种下一颗「行动种子」，信使鸟（个人 Agent）帮它找到同行者，双方确认后种子发芽成「事件植物」，事件 AI 协助破冰与推进，真实行动完成后植物开花、进入双方的「森林」，并可结出新种子发起下一次行动。

- 产品蓝本：`docs/social-forest-prd-v0.md`（飞书《社交森林产品PRD初版》存档，含完整视觉规范）
- 领域词汇表：`CONTEXT.md` — 写代码/文档前先读
- 本仓库是 social（共域）→ social-beta（池塘）之后的第三代：**教训是先跑通完整可体验的产品，再谈概念**。AI 能力必须真实调用 LLM（火山方舟 ARK），不做 stub/mock。

## 硬性产品红线（评审四问的答案，不可违反）

1. AI 只出候选与草稿，**连接对象由真人选择**。
2. AI 不代表用户承诺、不代答、不自动确认安排。
3. A2A（Agent 对 Agent）对话必须明确标注为 Agent 对话，且不交换联系方式/敏感信息。
4. 共同回忆需双方确认行动完成且双方愿意再组队才生成；任一方拒绝则不生成，且不告知是谁拒绝。

## 常用命令

```bash
pnpm dev        # 本地开发（web 应用）
pnpm build      # 构建
pnpm typecheck  # 类型检查
pnpm lint       # Lint
```

环境变量见 `.env.example`；真实密钥在 `.env.local`（已 gitignore，从 social-beta 沿用 ARK 配置）。

## Agent skills

### Issue tracker

Issues 和 PRD 存为 `xinzhuwang-wxz/social--gamma` 的 GitHub issue，用 `gh` CLI 操作。见 `docs/agents/issue-tracker.md`。

### Triage labels

沿用五个标准角色的默认标签串（`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`）。见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文布局：根目录 `CONTEXT.md` + `docs/adr/`。见 `docs/agents/domain.md`。
