// Regenerates the system diagram in README.md from the code. Run: node scripts/readme-diagram.mjs
// Reads table names from convex/schema.ts, cron names from convex/crons.ts, pages from app/, and
// the delivery channels from convex/notify.ts, then rewrites the block between the diagram markers.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const tables = [...read("convex/schema.ts").matchAll(/^\s+([a-zA-Z]+):\s*defineTable/gm)].map((m) => m[1]);
const crons = [...read("convex/crons.ts").matchAll(/crons\.(interval|hourly|daily|weekly|cron)\(\s*"([^"]+)"\s*,\s*(\{[^}]*\})?/g)].map((m) => {
  const mins = m[3]?.match(/minutes:\s*(\d+)/)?.[1];
  return `${m[2]}${m[1] === "interval" ? ` every ${mins ?? "?"} min` : ` ${m[1]}`}`;
});
const pages = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f === "page.tsx") pages.push("/" + p.replace(/^app\/?/, "").replace(/\([^)]+\)\/?/g, "").replace(/\/?page\.tsx$/, "")); } };
if (existsSync("app")) walk("app");
const notify = read("convex/notify.ts");
const channels = ["email", "imessage"].filter((c) => notify.includes(`"${c}"`));
const components = [...read("convex/convex.config.ts").matchAll(/app\.use\((\w+)/g)].map((m) => m[1]);

const pad = (s, n) => (s + " ".repeat(Math.max(0, n - s.length)));
const W = Math.max(61, `components: ${components.join(", ")}`.length + 12, `tables: ${tables.join(", ")}`.length + 12);
const box = (s) => "  |  " + pad(s, W - 4) + "|";
const rule = "  +" + "-".repeat(W - 2) + "+";
const lines = [
  "```",
  "                 api.warframestat.us  (fallback: api.warframe.com/cdn/worldState.php)",
  "                            |",
  `                  cron: ${pad(crons.join(", "), 50)}`,
  "                            v",
  rule,
  box(`Convex  components: ${components.join(", ")}`),
  box(""),
  box(`tables: ${tables.join(", ")}`),
  box(""),
  box("ingest.pull -> normalize -> apply -> worldEvents"),
  box("      rules.evaluate (matcher, rate limit) -> notifications"),
  box("      notify.send / notify.digest"),
  box("agent (OpenAI): chat tools, rule builder"),
  rule,
  "         |                     |                       |",
  "         v                     v                       v",
  "  Next.js pages          " + pad(channels.includes("email") ? "Resend email" : "", 22) + "  " + (channels.includes("imessage") ? "Photon iMessage / SMS" : ""),
  ...pages.sort().map((p) => "  " + (p === "/" ? "/  (landing)" : p)),
  "```",
];
const md = read("README.md");
const start = "<!-- diagram:start -->", end = "<!-- diagram:end -->";
const a = md.indexOf(start), b = md.indexOf(end);
if (a < 0 || b < 0) throw new Error("diagram markers missing in README.md");
writeFileSync("README.md", md.slice(0, a + start.length) + "\n" + lines.join("\n") + "\n" + md.slice(b));
console.log("README diagram updated:", tables.length, "tables,", crons.length, "crons,", pages.length, "pages");
