import { generateObject } from "ai";
import { z } from "zod";
import { fastModel, NO_THINK } from "./provider";
import { clarifyStepSchema, seedCardSchema } from "./schemas";

export const CLARIFY_SYSTEM = `你是「小叶」，用户的信使鸟——帮用户把模糊的行动愿望变成一颗清晰的行动种子。

你的任务是收集这些必要信息：
1. 做什么（具体行动，不是交友宣言）
2. 大致时间
3. 大致地点或范围
4. 希望几个人一起
5. 对同行者的必要要求（并区分哪些「必须」、哪些「可以商量」）

规则：
- 每次只追问「当前缺失的一项」，不要一次问多个问题。
- 每次追问都给 2-4 个常见的快捷答案选项（options），让用户一键选择；用户也可以自己打字补充。
- 第一轮可以给常见活动类型作为选项（如 爬山/打球/看展/自习）。
- 后续围绕时间、地点、人数、要求，每次只问一项，选项贴合上一步回答。
- 用户已经说过的信息绝不重复问。
- 语气自然温暖，像朋友，不像客服；每句话不超过 40 字。
- 细节方案（具体路线、吃什么）不需要在这里确定，成局后双方商量。
- 信息足够时停止追问，简短确认即可，options 给空数组。
- **不要重复同一句话**：如果用户连续给出「随便/不知道/都行」这类无效回答，换个策略——直接从 options 里替他先定一个最常见的选项、或给出更具体的例子（如「比如周六下午去操场打球？」），别再问一样的问题。
- 生成种子卡时，requirements 只写真正有意义的条件；如果确实没有特别要求，must 和 flexible 都给空数组，不要写「无特殊要求」这类占位。`;

export type ClarifyMessage = { role: "user" | "assistant"; content: string };

const activityDetailQuestionSchema = z.object({
  reply: z.string().describe("只问一个与当前活动强相关的规划问题，≤40 字"),
  options: z.array(z.string()).min(2).max(4).describe("2-4 个简短、互斥的快捷答案"),
});

export type ActivityDetailContext = {
  idea: string;
  time: string;
  place: string;
  companion: string;
  habit: string;
};

/** 标准信息收齐后，只补问一项真正影响该活动体验的专项信息。 */
export async function activityDetailQuestion(context: ActivityDetailContext) {
  const { object } = await generateObject({
    model: fastModel,
    schema: activityDetailQuestionSchema,
    providerOptions: NO_THINK,
    system: `你是「小绿」，用户的信使鸟。标准发布信息已经收齐，现在只补问一个与活动本身强相关、且会影响规划或匹配的问题。
规则：
- 不再询问活动、时间、地点、同行者要求或相处习惯。
- 只问一项。优先问目标、强度、经验、时长、装备、票务等当前活动真正需要确认的信息。
- 问题必须适用于本次活动，不问联系方式、身份隐私或泛泛的性格标签。
- 给 2-4 个简短、互斥且覆盖常见情况的选项。
- 语气自然温暖，像朋友，不像表单。`,
    prompt: `活动：${context.idea}\n时间：${context.time}\n地点：${context.place}\n同行者期待：${context.companion}\n相处习惯：${context.habit}\n请生成最后一条活动专项确认问题。`,
  });
  return object;
}

/**
 * 澄清对话推进一步：根据历史判断是否信息已足够。
 * ready=false → reply 是下一句追问；ready=true → card 为种子卡草稿。
 */
export async function clarifyStep(history: ClarifyMessage[]) {
  const { object } = await generateObject({
    model: fastModel,
    schema: clarifyStepSchema,
    providerOptions: NO_THINK,
    system:
      CLARIFY_SYSTEM +
      `\n\n现在根据对话历史输出 JSON：ready（信息是否足够）、reply（你的下一句话）、options（本轮 2-4 个快捷答案，ready 时空数组）、card（ready 时的种子卡，否则 null）。
注意：用户明确表示「没有别的要求/就这样」时，视为信息已足够，ready 给 true。ready 为 true 时 card 必须完整给出。`,
    messages: history,
  });

  // 兜底：模型偶发 ready=true 但 card=null 时，直接从对话抽取种子卡
  if (object.ready && !object.card) {
    const { object: card } = await generateObject({
      model: fastModel,
      schema: seedCardSchema,
      providerOptions: NO_THINK,
      system: "从下面的对话中抽取行动种子卡。只用对话中出现的信息，不编造。",
      prompt: history.map((m) => `${m.role === "user" ? "用户" : "小叶"}: ${m.content}`).join("\n"),
    });
    return { ...object, options: [], card };
  }
  return object;
}
