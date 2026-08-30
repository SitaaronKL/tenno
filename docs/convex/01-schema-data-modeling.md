# Schema & Data Modeling

Schema file: `convex/schema.ts`. Optional (prototyping w/o schema is fine), but gives runtime validation + end-to-end types
(`Doc<"table">`, `Id<"table">` from `./_generated/dataModel`).

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  messages: defineTable({
    body: v.string(),
    userId: v.id("users"),
    channel: v.string(),
    kind: v.union(v.literal("text"), v.literal("image")),
    imageId: v.optional(v.id("_storage")),
    meta: v.object({ edited: v.boolean() }),
    tags: v.array(v.string()),
    reactions: v.record(v.string(), v.number()),
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_channel", ["channel"])                    // _creationTime is implicitly appended
    .index("by_user_and_channel", ["userId", "channel"])
    .searchIndex("search_body", { searchField: "body", filterFields: ["channel"] })
    .vectorIndex("by_embedding", { vectorField: "embedding", dimensions: 1536, filterFields: ["channel"] }),
}, {
  schemaValidation: true,      // default true: docs must match schema at write time
  strictTableNameTypes: true,  // default true: TS forbids ctx.db.query("unknownTable")
});
```

## Validators (`v` from `convex/values`)

| Validator | Notes |
|---|---|
| `v.string()`, `v.number()` (float64), `v.int64()` (bigint), `v.boolean()`, `v.null()` | primitives |
| `v.id("table")` | document ID; also `v.id("_storage")`, `v.id("_scheduled_functions")` |
| `v.optional(x)` | field may be absent (`undefined`) |
| `v.union(a, b, ...)`, `v.literal("x")` | discriminated unions / enums |
| `v.object({...})`, `v.array(x)`, `v.record(keyValidator, valueValidator)` | containers |
| `v.bytes()` | ArrayBuffer |
| `v.any()` | escape hatch |

Same validators are used for function `args`/`returns`. Use `Infer<typeof validator>` to derive TS types.
Reuse validators: `const taskFields = { text: v.string() }; defineTable(taskFields)` and `args: taskFields`.

## System fields
Every document gets `_id: Id<"table">` and `_creationTime: number` (ms since epoch). Default query order is by `_creationTime`.

## Indexes
- `.index(name, [fields...])` — query with `.withIndex(name, q => q.eq("a", x).gt("b", y))`. Fields must be used
  in index order; equality on prefix fields, then optionally one range on the next field.
- Indexes also define sort order: `.withIndex("by_channel", q => q.eq("channel", c)).order("desc")` sorts by
  `_creationTime` desc within channel.
- Limits: 32 indexes/table, 16 fields/index, name ≤ 64 chars. Index `by_a` is usually redundant with `by_a_and_b`.
- Search index: 1 `searchField` (string), up to 16 `filterFields`; query `.withSearchIndex(name, q => q.search("body", text).eq("channel", c))`.
  Last term gets prefix matching (typeahead). BM25 ranking. Max 1024 scanned results.
- Vector index: `vectorField` must be `v.array(v.float64())`, dimensions 2–4096, ≤16 filterFields, ≤4 vector
  indexes/table. Only searchable from **actions** via `ctx.vectorSearch` (see 02-functions.md).

## Modeling tips
- No joins/aggregations in the DB — do them in JS in the query handler (`Promise.all` for parallel `ctx.db.get`).
- Relationships: store `Id<"other">` on the child; index the foreign key (`by_userId`).
- Circular references: make one side `v.optional(...)`, insert first, then `patch` the reference.
- Prefer coarse boolean/status fields updated by scheduled functions over `Date.now()` comparisons in queries.
- Many-to-many: a join table `{ aId, bId }` with indexes `by_a` and `by_b`.
- Large counts/aggregates: use the Aggregate or Sharded Counter components, not `.collect().length`.

## Schema migrations
Push a new schema with `npx convex dev`; validation fails if existing docs don't match. Typical flow: add field as
`v.optional`, backfill with a migration (`@convex-dev/migrations` component or an internal mutation loop), then tighten.
