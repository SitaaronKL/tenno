# File Storage

Files of any type; referenced by `Id<"_storage">` (validator `v.id("_storage")`). Store the ID in your tables.

## Upload (recommended: upload URL, no size limit, 2-minute URL expiry)
```ts
// convex/files.ts
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // check auth here
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveImage = mutation({
  args: { storageId: v.id("_storage"), channel: v.string() },
  handler: async (ctx, { storageId, channel }) =>
    ctx.db.insert("messages", { channel, kind: "image", imageId: storageId, body: "" }),
});
```
```ts
// client
const postUrl = await generateUploadUrl();
const res = await fetch(postUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
const { storageId } = await res.json();
await saveImage({ storageId, channel });
```

## Upload via HTTP action (≤20 MiB, needs CORS)
```ts
http.route({ path: "/upload", method: "POST", handler: httpAction(async (ctx, request) => {
  const blob = await request.blob();
  const storageId = await ctx.storage.store(blob);
  await ctx.runMutation(api.files.saveImage, { storageId, channel: "general" });
  return new Response(null, { status: 200, headers: { "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN!, Vary: "origin" } });
}) });
```

## Store files generated in actions
```ts
const res = await fetch(imageUrl);
const storageId = await ctx.storage.store(await res.blob());
```

## Serve
```ts
// in a query: signed-ish public URL (anyone with URL can read; URL is stable)
const url = await ctx.storage.getUrl(message.imageId); // string | null
// in an HTTP action: gate access yourself
const blob = await ctx.storage.get(storageId);         // Blob | null (actions/http only)
return blob ? new Response(blob) : new Response("Not found", { status: 404 });
```
Batch URLs in queries with `Promise.all`. `getUrl` does no auth — don't leak IDs of private files, or serve through
an HTTP action with permission checks (20 MiB response cap).

## Metadata & delete
```ts
const meta = await ctx.db.system.get("_storage", storageId); // { _id, _creationTime, sha256, size, contentType? }
await ctx.db.system.query("_storage").collect();
await ctx.storage.delete(storageId);                        // mutations/actions
```
`ctx.storage.getMetadata()` is deprecated — use the `_storage` system table.

## Gotchas
- Deleting a document does not delete its file; delete explicitly (or via a scheduled cleanup).
- Set `Content-Type` on upload so `contentType` is recorded and browsers render it correctly.
- `ctx.storage.get`/`store` are not available in queries/mutations (only `generateUploadUrl`, `getUrl`, `delete`).
