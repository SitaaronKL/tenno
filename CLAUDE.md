# Tenno

Warframe companion app. Read `docs/CONTRACT.md` before touching code, then the matching folder in `docs/`.

Style: no dashes in prose, commit messages, or PR titles (use commas or a colon). Short plain sentences. Comments say why, one line.
Slices: about 300 added lines, own branch `dhruv/slice-<n>-<name>`, `<slice>.questions.md` at repo root for assumptions.
Checks before push: `npx tsc --noEmit`, `npm run build`, `npm test`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
Commits: plain messages only. Never add Co-Authored-By lines or session links.

Tests: vitest, red then green, co located beside the file under test (foo.test.ts next to foo.ts). No central tests folder.
Upstream: api.warframestat.us can lag by hours, always check its timestamp and fall back to https://api.warframe.com/cdn/worldState.php.
