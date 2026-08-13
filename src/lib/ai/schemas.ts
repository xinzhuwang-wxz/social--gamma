import { z } from "zod";

/** 种子卡（澄清完成后的结构化行动需求） */
export const seedCardSchema = z.object({
  title: z.string().describe("简短事件名，如「周六去爬山」，不超过 12 字"),
  what: z.string().describe("做什么，一两句话"),
  whenText: z.string().describe("大致时间，如「周六 8:30 - 下午」"),
  whereText: z.string().describe("大致地点或范围"),
  groupSize: z.string().describe("希望人数，如「2人」「3-4人」"),
  requirements: z.object({
    must: z.array(z.string()).describe("必要条件，1-3 条"),
    flexible: z.array(z.string()).describe("可以商量的条件，1-3 条"),
  }),
  tags: z.array(z.string()).describe("1-3 个分类标签，如 户外/运动/文艺"),
});
export type SeedCard = z.infer<typeof seedCardSchema>;

/** 澄清对话的下一步：追问 or 成卡（含单题选项 chip，方案 A 交互）*/
export const clarifyStepSchema = z.object({
  ready: z.boolean().describe("必要信息（做什么/时间/地点/人数要求）是否已足够"),
  reply: z.string().describe("小叶的下一句话：不足则只追问缺失的一项，足够则简短确认"),
  options: z
    .array(z.string())
    .describe(
      "针对本轮问题的 2-4 个常见快捷答案（供用户一键选择），每个不超过 10 字；ready 为 true 时给空数组"
    ),
  card: seedCardSchema.nullable().describe("ready 为 true 时给出种子卡，否则为 null"),
});

/** 匹配评估（对单个候选人） */
export const matchEvalSchema = z.object({
  results: z.array(
    z.object({
      candidateId: z.string(),
      score: z.number().min(0).max(100).describe("适配度"),
      reasons: z
        .array(
          z.object({
            type: z.enum(["time", "place", "interest", "experience"]),
            text: z.string().describe("一句话理由，面向候选人展示"),
          })
        )
        .describe("1-3 条分类理由"),
      worthDelivering: z.boolean().describe("是否值得投递（基本条件不冲突）"),
    })
  ),
});

/** A2A 预热对话 */
export const a2aSchema = z.object({
  turns: z
    .array(
      z.object({
        agent: z.enum(["owner", "candidate"]),
        text: z.string(),
      })
    )
    .describe("4-6 轮双方 Agent 的简短对话，只谈本次事件相关信息"),
  commonalities: z.array(z.string()).describe("双方与本次事件相关的共同点 2-3 条"),
  icebreakHints: z.array(z.string()).describe("给真人破冰准备的素材 2-3 条"),
});

/** 成局时的房间开场：双向摘要卡 + 一次破冰 */
export const kickoffSchema = z.object({
  forOwner: z.object({
    highlights: z.array(z.string()).describe("对方（同行者）与本次事件相关的特点经验 2-3 条"),
    commonalities: z.array(z.string()).describe("双方共同点 1-2 条"),
    toDiscuss: z.array(z.string()).describe("仍需沟通的事项 1-2 条"),
  }),
  forPartner: z.object({
    highlights: z.array(z.string()).describe("对方（发起人）与本次事件相关的特点经验 2-3 条"),
    commonalities: z.array(z.string()).describe("双方共同点 1-2 条"),
    toDiscuss: z.array(z.string()).describe("仍需沟通的事项 1-2 条"),
  }),
  icebreak: z.object({
    message: z.string().describe("小苗 的一次破冰消息：必须来自共同点或本次事件，友好自然"),
    quickReplies: z.array(z.string()).describe("3 个与本次事件相关的快捷回复"),
  }),
});

/** 事件 AI 的一次行动推进。没有明确下一步时必须保持沉默。 */
export const eventInterventionSchema = z.object({
  shouldIntervene: z.boolean().describe("本轮是否真的能推动行动跨过一个卡点"),
  action: z
    .enum([
      "none",
      "ask_missing",
      "offer_choices",
      "request_decision",
      "confirm_decision",
      "create_pact",
    ])
    .describe(
      "none=保持沉默；ask_missing=补一个缺项；offer_choices=给有限方案；request_decision=请某位成员决定；confirm_decision=请双方确认共识；create_pact=信息足够生成行动约定"
    ),
  text: z.string().describe("面向群聊的推进话术；沉默时为空字符串，介入时不超过 70 字"),
  options: z
    .array(z.string())
    .max(3)
    .describe("0-3 个可直接作为真人回复发送的选项，只能来自对话或种子已有信息"),
});
export type EventIntervention = z.infer<typeof eventInterventionSchema>;

/** 行动约定草稿（只整理已谈内容） */
export const pactDraftSchema = z.object({
  what: z.string().describe("要共同完成的行动"),
  when: z.string().describe("时间或时间范围"),
  where: z.string().describe("地点/集合方式"),
  meet: z.string().describe("集合时间与方式，如「8:30 校北门集合」"),
  notes: z.array(z.string()).describe("影响行动的必要备注 0-3 条，只含双方谈过的内容"),
  missing: z.array(z.string()).describe("双方还没谈到、约定里留空的要素（如果有）"),
});

/** 共同回忆一句话 */
export const memorySummarySchema = z.object({
  summary: z.string().describe("为这段共同经历写一句温暖的总结，不超过 30 字"),
});
