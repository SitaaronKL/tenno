# Tenno

Warframe companion app. Read `docs/CONTRACT.md` before touching code, then the matching folder in `docs/`.

Style: no dashes in prose, commit messages, or PR titles (use commas or a colon). Short plain sentences. Comments say why, one line.
Slices: about 300 added lines, own branch `dhruv/slice-<n>-<name>`, `<slice>.questions.md` at repo root for assumptions.
Checks before push: `npx tsc --noEmit`, `npm run build`, `npm test`.
