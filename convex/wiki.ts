import { v } from "convex/values";
import { action } from "./_generated/server";
import { requireUser } from "./lib/auth";

const API = "https://wiki.warframe.com/api.php";
const TTL_MS = 60 * 60 * 1000;

// In memory so we do not need a table before slice 1 lands the schema.
const cache = new Map<string, { at: number; value: SearchResult }>();

export type SearchResult = {
  query: string;
  hits: { title: string; url: string }[];
  extract: string | null;
};

const vResult = v.object({
  query: v.string(),
  hits: v.array(v.object({ title: v.string(), url: v.string() })),
  extract: v.union(v.string(), v.null()),
});

function pageUrl(title: string) {
  return `https://wiki.warframe.com/w/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

// Wiki html is verbose, the model only needs the lead paragraphs.
function toPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

export async function fetchSearch(q: string): Promise<SearchResult> {
  const cached = cache.get(q);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  const searchUrl = `${API}?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5&format=json&formatversion=2`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`Wiki search failed: ${searchRes.status}`);
  const searchJson = (await searchRes.json()) as {
    query?: { search?: { title: string }[] };
  };
  const titles = (searchJson.query?.search ?? []).map((s) => s.title);

  let extract: string | null = null;
  if (titles.length > 0) {
    const parseUrl = `${API}?action=parse&page=${encodeURIComponent(titles[0])}&prop=text&section=0&format=json&formatversion=2`;
    const parseRes = await fetch(parseUrl);
    if (parseRes.ok) {
      const parseJson = (await parseRes.json()) as { parse?: { text?: string } };
      if (parseJson.parse?.text) extract = toPlainText(parseJson.parse.text);
    }
  }

  const value: SearchResult = {
    query: q,
    hits: titles.map((title) => ({ title, url: pageUrl(title) })),
    extract,
  };
  cache.set(q, { at: Date.now(), value });
  return value;
}

export const searchItems = action({
  args: { q: v.string() },
  returns: vResult,
  handler: async (ctx, { q }) => {
    await requireUser(ctx);
    return await fetchSearch(q);
  },
});
