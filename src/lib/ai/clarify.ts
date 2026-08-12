import { generateObject } from "ai";
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
- 信息足够时停止追问，简短确认即可，options 给空数组。`;

export type ClarifyMessage = { role: "user" | "assistant"; content: string };

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
