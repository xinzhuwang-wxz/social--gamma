import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const files = [
  { filename: "flower_photo-l1.png", maxContentSize: 760 },
  { filename: "flower_film-l1.png", maxContentSize: 760 },
  { filename: "fusion_partner_orange_2.png", maxContentSize: 900 },
];

async function removeEdgeBackground(filepath: string, maxContentSize: number) {
  const input = fs.readFileSync(filepath);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  const background = [0, 1, 2].map((channel) => Math.round(corners.reduce((sum, pixel) => sum + data[pixel * channels + channel], 0) / corners.length));
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const enqueue = (pixel: number) => {
    if (visited[pixel]) return;
    visited[pixel] = 1;
    const offset = pixel * channels;
    if (Math.hypot(data[offset] - background[0], data[offset + 1] - background[1], data[offset + 2] - background[2]) > 46) return;
    data[offset + 3] = 0;
    queue[tail++] = pixel;
  };
  for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 0; y < height; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(pixel - 1);
    if (x + 1 < width) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - width);
    if (y + 1 < height) enqueue(pixel + width);
  }
  const transparent = await sharp(data, { raw: info }).png().toBuffer();
  const trimmed = await sharp(transparent)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(maxContentSize, maxContentSize, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const temporary = `${filepath}.transparent.png`;
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed, gravity: "center" }])
    .png()
    .toFile(temporary);
  fs.renameSync(temporary, filepath);
}

async function main() {
  await Promise.all(files.map(({ filename, maxContentSize }) => removeEdgeBackground(path.resolve(process.cwd(), "public/world/generated", filename), maxContentSize)));
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
