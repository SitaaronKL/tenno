// Seeds the reference tables straight from the checked in JSON, without shipping any of it in a
// Convex function bundle. Usage: node scripts/seed-tables.mjs [table...] [--dry-run] [--out dir]
//
// Every table here is game data, the same for everyone and rebuilt by its own build script, so the
// import replaces the table rather than merging into it. Convex reads JSON Lines, one row a line.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function entries(record) {
  return Object.entries(record ?? {});
}

// One entry per table: where the file is, and how its shape becomes one row per document.
export const TABLES = {
  items: {
    file: "convex/gamedata/items.json",
    build: "node scripts/import-public-export.mjs",
    rows: (data) => data,
  },
  starNodes: {
    file: "convex/gamedata/nodes.json",
    build: "node scripts/import-public-export.mjs",
    rows: (data) => data,
  },
  mods: {
    file: "convex/gamedata/mods.json",
    build: "node scripts/import-public-export.mjs",
    rows: (data) => data,
  },
  parts: {
    file: "convex/gamedata/components.json",
    build: "node scripts/build-components.mjs",
    rows: (data) => data,
  },
  dropSources: {
    file: "convex/gamedata/dropSources.json",
    build: "node scripts/build-drop-sources.mjs",
    rows: (data) => entries(data.items).map(([itemName, sources]) => ({ itemName, sources })),
  },
  deNames: {
    file: "convex/gamedata/deNames.json",
    build: "node scripts/build-de-names.mjs",
    // The table is keyed by lowercase path, the same key normalizeDe looks up.
    rows: (data) =>
      entries(data.paths).map(([path, entry]) =>
        typeof entry === "string"
          ? { path, value: entry }
          : { path, value: entry.value, ...(entry.desc ? { desc: entry.desc } : {}) },
      ),
  },
};

// Convex rejects a document carrying undefined, and a blank line is not a row, so the shaping is
// checked here rather than three minutes into an import.
export function toJsonl(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("no rows to import");
  return (
    rows
      .map((row, index) => {
        if (row === null || typeof row !== "object" || Array.isArray(row)) {
          throw new Error(`row ${index} is not an object`);
        }
        for (const [key, value] of Object.entries(row)) {
          if (value === undefined) throw new Error(`row ${index} has an undefined ${key}`);
        }
        return JSON.stringify(row);
      })
      .join("\n") + "\n"
  );
}

export function shape(table, data) {
  const spec = TABLES[table];
  if (!spec) throw new Error(`no such table: ${table}`);
  return spec.rows(data);
}

function read(table) {
  const spec = TABLES[table];
  try {
    return JSON.parse(readFileSync(spec.file, "utf8"));
  } catch {
    throw new Error(`${spec.file} is missing or unreadable, run ${spec.build} first`);
  }
}

function main(argv) {
  const dryRun = argv.includes("--dry-run");
  const outFlag = argv.indexOf("--out");
  const outDir =
    outFlag >= 0 ? argv[outFlag + 1] : mkdtempSync(join(tmpdir(), "voidwatch-seed-"));
  const asked = argv.filter((arg) => !arg.startsWith("--") && arg !== argv[outFlag + 1]);
  const tables = asked.length > 0 ? asked : Object.keys(TABLES);

  for (const table of tables) {
    const rows = shape(table, read(table));
    const path = join(outDir, `${table}.jsonl`);
    writeFileSync(path, toJsonl(rows));
    console.log(`${table}: ${rows.length} rows, ${path}`);
    if (dryRun) continue;
    execFileSync(
      "npx",
      ["convex", "import", "--table", table, "--format", "jsonLines", "--replace", "-y", path],
      { stdio: "inherit" },
    );
  }
}

// Importing this file for its shaping functions must not start an import.
if (process.argv[1] && process.argv[1].endsWith("seed-tables.mjs")) {
  main(process.argv.slice(2));
}
