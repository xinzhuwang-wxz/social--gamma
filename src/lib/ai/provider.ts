import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * 火山方舟 ARK（OpenAI 兼容）。
 * 交互路径用 fast（关闭深度思考，低时延）；复杂推理用 strong。
 * 经实测：关闭思考的正确参数是 body.thinking = {type:"disabled"}。
 */
const ark = createOpenAICompatible({
  name: "ark",
  apiKey: process.env.ARK_API_KEY ?? "",
  baseURL: process.env.ARK_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3",
  // ARK 实测支持严格 json_schema 结构化输出（generateObject 依赖）
  supportsStructuredOutputs: true,
});

export const FAST_MODEL = process.env.ARK_CHAT_MODEL ?? "doubao-seed-2-0-lite-260428";
export const STRONG_MODEL = process.env.ARK_CHAT_MODEL_STRONG ?? "doubao-seed-2-0-lite-260428";

export const fastModel = ark(FAST_MODEL);
export const strongModel = ark(STRONG_MODEL);

/** 关闭深度思考的 providerOptions（透传进请求 body） */
export const NO_THINK = {
  ark: { thinking: { type: "disabled" } },
} as const;
