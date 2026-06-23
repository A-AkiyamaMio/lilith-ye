import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const apiKey = process.env.OPENAI_API_KEY;
const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
const args = process.argv.slice(2);
const outFlagIndex = args.indexOf("--out");
const out = resolve(outFlagIndex >= 0 ? args[outFlagIndex + 1] : "assets/generated-asset.png");
if (outFlagIndex >= 0) {
  args.splice(outFlagIndex, 2);
}
const prompt = args.join(" ").trim();

if (!apiKey) {
  console.error("OPENAI_API_KEY is not set.");
  process.exit(1);
}

if (!prompt) {
  console.error('Usage: npm run generate:asset -- "your image prompt"');
  process.exit(1);
}

const body = {
  model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
  prompt,
  size: process.env.OPENAI_IMAGE_SIZE || "1024x1024",
  quality: process.env.OPENAI_IMAGE_QUALITY || "low",
  output_format: "png"
};

const response = await fetch(`${baseUrl}/v1/images/generations`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json"
  },
  body: JSON.stringify(body)
});

if (!response.ok) {
  const text = await response.text().catch(() => "");
  console.error(`Image generation failed: ${response.status} ${response.statusText}`);
  if (text) console.error(text.slice(0, 1200));
  process.exit(1);
}

const data = await response.json();
const b64 = data?.data?.[0]?.b64_json;
if (!b64) {
  console.error("Image generation returned no b64_json image data.");
  console.error(JSON.stringify(data).slice(0, 1200));
  process.exit(1);
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(b64, "base64"));
console.log(`Wrote ${out}`);
