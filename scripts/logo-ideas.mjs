// Generate logo concepts with Nano Banana (Gemini image model). Run: node scripts/logo-ideas.mjs
// Needs GEMINI_API_KEY in .env.local. Writes PNGs to public/logo-ideas and a manifest for /logo.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => l.split("=").map((s) => s.trim())),
);
const key = process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY;
if (!key) throw new Error("GEMINI_API_KEY missing");
const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-flash-image-preview";

const base =
  "Minimal flat vector logo mark for an app called Voidwatch, a Warframe companion that watches the game world and alerts players. " +
  "Single centered icon on a solid black background, one accent color gold #f5b942 plus white, no text, no gradients, no 3D, no shadows, thick clean geometric strokes, must read clearly at 16 pixels, app icon style. Concept: ";
const concepts = [
  "an abstract eye whose iris is a black hole with a gold event horizon ring",
  "a stylized void tear, a vertical slit with gold light leaking through the gap",
  "a crescent moon shaped like a watching eye, gold pupil",
  "a radar sweep inside a hexagon, one gold blip",
  "the letter V formed by two orbiting rings, a gold node at their crossing",
  "a lotus flower silhouette where the center petal is an open eye",
  "a black hole accretion disc seen edge on, thin gold ring, tilted",
  "a chevron pointing down like a sentinel over a horizon line, gold sun",
];

mkdirSync("public/logo-ideas", { recursive: true });
const manifest = [];
for (const [i, c] of concepts.entries()) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: base + c }] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } } }),
  });
  const json = await res.json();
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) { console.error(i, "no image", JSON.stringify(json).slice(0, 300)); continue; }
  const file = `public/logo-ideas/${String(i + 1).padStart(2, "0")}.png`;
  writeFileSync(file, Buffer.from(part.inlineData.data, "base64"));
  manifest.push({ file: file.replace("public", ""), concept: c });
  console.log("wrote", file);
}
writeFileSync("public/logo-ideas/manifest.json", JSON.stringify(manifest, null, 2));
