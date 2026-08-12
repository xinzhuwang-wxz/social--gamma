import fs from "node:fs";
import path from "node:path";

const IMAGE_DIR = path.resolve(process.cwd(), "data/images");

/**
 * 调用 ARK seedream 生图接口，把插画写到 data/images/{memoryId}.png，返回文件名。
 * 失败时抛错，由调用方容错。
 */
export async function generateMemoryIllustration({
  memoryId,
  title,
  entryTexts,
}: {
  memoryId: string;
  title: string;
  entryTexts: string[];
}): Promise<string> {
  const apiKey = process.env.ARK_API_KEY;
  const baseUrl =
    process.env.ARK_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3";
  const model =
    process.env.ARK_IMAGE_MODEL ?? "doubao-seedream-4-0-250828";

  if (!apiKey) throw new Error("ARK_API_KEY not set");

  const contextStr = entryTexts.filter(Boolean).join("，");
  const chineseContext = contextStr ? `，双方留下了这些感受：${contextStr}` : "";

  const prompt = [
    "watercolor illustration, two college students sharing a warm moment together",
    `during "${title}"${chineseContext}`,
    "warm rice white background #F7F0DE, olive green color palette,",
    "simplified color blocks, minimal detail, no text, no words, soft and cheerful,",
    "手绘水彩插画风格，清爽简洁，暖米白背景，橄榄绿系，无文字",
  ].join(" ");

  fs.mkdirSync(IMAGE_DIR, { recursive: true });

  const res = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ARK image API error ${res.status}: ${errText}`);
  }

  const json = (await res.json()) as {
    data: Array<{ b64_json?: string; url?: string }>;
  };
  const item = json.data?.[0];
  if (!item) throw new Error("ARK image API: empty data array");

  const filename = `${memoryId}.png`;
  const filepath = path.join(IMAGE_DIR, filename);

  if (item.b64_json) {
    const buf = Buffer.from(item.b64_json, "base64");
    fs.writeFileSync(filepath, buf);
  } else if (item.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok)
      throw new Error(`Failed to download image: ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(filepath, buf);
  } else {
    throw new Error("ARK image API: no b64_json or url in response item");
  }

  return filename;
}
