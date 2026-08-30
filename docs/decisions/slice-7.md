# Slice 7 questions and assumptions

Agent and chat. Owns `convex/agent/*`, `convex/wiki.ts`, `app/(app)/chat/*`.

## Files I do not own but had to create so the slice compiles

The `convex/` folder was empty apart from the README, so nothing typechecked.

- `convex/convex.config.ts` (slice 1): stub registering only the agent component. Take slice 1's version at merge, it must keep `app.use(agent)`.
- `convex/lib/auth.ts` (slice 1): stub `requireUser(ctx)` returning the auth user id or throwing. Take slice 1's version.
- `convex/_generated/*`: made with `npx convex codegen` with no deployment credentials, so `api`, `internal` and `components` come out as the permissive `AnyApi` / `AnyComponents` types. Seam should regenerate against a real deployment. Because `components` is untyped there, `convex/agent/index.ts` exports `agentComponent = components.agent as unknown as AgentComponent` and everything in the slice uses that. The cast stays correct after a real codegen.
- `vitest.config.mts` and the `"test": "vitest run"` script did not exist, added them.
- `.env.local` holds a dummy `NEXT_PUBLIC_CONVEX_URL` for the build, it is gitignored.

## Packages added

`vitest`, `convex-test`, `@edge-runtime/vm` as devDependencies. No runtime dependency added.

## Deviations from the contract, and why

- **`internal.wiki.search` vs `wiki.searchItems`.** The slice brief says the searchItems tool calls `internal.wiki.search`, the contract table says `convex/wiki.ts` exports the action `searchItems({q})`. I followed the contract: one public action `searchItems`, `requireUser` inside it, and the tool calls `api.wiki.searchItems`. Auth propagates through `ctx.runAction`.
- **No `wikiCache` table.** The contract allows an in memory cache, and adding a table means editing `convex/schema.ts`, which slice 1 owns. `convex/wiki.ts` keeps a module level `Map` with a one hour TTL. If slice 1 wants the durable version, the table is `wikiCache { q: string, fetchedAt: number, hits: {title, url}[], extract: string | null }` with index `by_q [q]`, and `fetchSearch` becomes a query plus mutation pair.
- **`getWorldState` reads through `api.worldstate.get`, not the table.** The brief says read the `worldState` table, but tools run in an action context which has no `ctx.db`, and `worldstate.get({platform})` is the contracted read. Same data, one hop.
- **`listMessages({threadId})` returns a plain array**, not a paginated result, and there is no streaming. Streaming was not required. It maps each message to `{ key, role, text, status }` so the page does not depend on agent internals.
- **`startThread` reuses the user's newest thread** instead of always creating one. Otherwise every page load starts an empty conversation, and the client would have to persist a thread id it cannot be trusted with. Creating a second thread per user is still possible later by adding an argument.
- **`sendMessage` is an action that awaits the reply**, per the brief. The agent docs prefer mutation plus scheduled action so the reply survives navigation. Worth revisiting if replies get slow.

## API drift found in the docs

`docs/convex/09-component-agent.md` is written against `@convex-dev/agent` 0.6 or earlier. In the installed 0.7.1:
- `createTool` takes `inputSchema` and `execute`, not `args` and `handler` (the old names are typed as errors).
- The Agent config key is `languageModel`, not `model`.
- `listUIMessages` takes `{ threadId, paginationOpts }` only, `streamArgs` is handled by `syncStreams`.

## Open questions for the seam

1. `openai("gpt-5.6-luna")` is used as given. `@ai-sdk/openai` is v4 against `ai` v7, it typechecks, but nobody has made a real call yet. If the provider rejects the model id, only `MODEL` in `convex/agent/index.ts` needs to change.
2. `ruleBuilder.draft` returns `v.any()` because the contract has no Convex validator for `RuleInput`, only the zod one. Slice 1 could mirror it in `convex/schema.ts` and I would tighten the validator.
3. `app/(app)/chat/page.tsx` loads the real chat with `ssr: false` because the Convex provider lives in the `(app)` layout that slice 2 owns. Once that layout exists the split can stay, it costs nothing.
4. The chat page assumes slice 2's shell supplies the page frame and auth gate. It renders its own header and nothing else.
